-- Limpy: workspaces compartilhados por código + senha (sem auth de usuário)
-- Rode este arquivo inteiro no SQL Editor do Supabase.

-- pgcrypto no Supabase fica em `extensions`. Garantimos que exista e seja
-- acessível; as funções abaixo usam `search_path` com `extensions` para
-- enxergar `gen_salt`, `crypt` e `gen_random_bytes`.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated;

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- =========================================================================
-- TABELAS
-- =========================================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  passcode_hash text not null,
  name text not null default 'Casa',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_tokens (
  token text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chores (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  notes text not null default '',
  icon_key text not null default 'home',
  start_at timestamptz not null,
  end_at timestamptz not null,
  column_id text not null check (column_id in ('backlog', 'doing', 'done')),
  remind_whats_app boolean not null default false,
  remind_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create index if not exists workspace_tokens_workspace_id_idx
  on public.workspace_tokens(workspace_id);

create index if not exists chores_workspace_id_idx
  on public.chores(workspace_id);

create index if not exists chores_start_at_idx
  on public.chores(start_at);

-- =========================================================================
-- RLS
-- Tudo direto bloqueado; o cliente usa apenas RPCs.
-- =========================================================================

alter table public.workspaces enable row level security;
alter table public.workspace_tokens enable row level security;
alter table public.chores enable row level security;

drop policy if exists workspaces_no_direct_access on public.workspaces;
create policy workspaces_no_direct_access
  on public.workspaces
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists workspace_tokens_no_direct_access on public.workspace_tokens;
create policy workspace_tokens_no_direct_access
  on public.workspace_tokens
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists chores_no_direct_access on public.chores;
create policy chores_no_direct_access
  on public.chores
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- =========================================================================
-- RPCs privadas (SECURITY DEFINER)
-- =========================================================================

-- Compatibilidade para reruns após mudanças de retorno/assinatura.
drop function if exists public.lp_create_workspace(text, text, text);
drop function if exists public.lp_verify_passcode(text, text);
drop function if exists public.lp_list_chores(text);
drop function if exists public.lp_upsert_chore(text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text);
drop function if exists public.lp_delete_chore(text, uuid);

drop function if exists private.lp_create_workspace_impl(text, text, text);
drop function if exists private.lp_verify_passcode_impl(text, text);
drop function if exists private.lp_list_chores_impl(text);
drop function if exists private.lp_upsert_chore_impl(text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text);
drop function if exists private.lp_delete_chore_impl(text, uuid);
drop function if exists private.lp_issue_workspace_token(uuid);

create or replace function private.lp_issue_workspace_token(
  p_workspace_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into public.workspace_tokens (token, workspace_id)
  values (v_token, p_workspace_id);

  return v_token;
end;
$$;

revoke all on function private.lp_issue_workspace_token(uuid) from public;
grant execute on function private.lp_issue_workspace_token(uuid) to anon, authenticated;

create or replace function private.lp_create_workspace_impl(
  p_code text,
  p_passcode text,
  p_name text default 'Casa'
)
returns table (id uuid, name text, code text, access_token text)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_code text := lower(trim(p_code));
  v_id uuid;
begin
  if v_code = '' or length(v_code) < 3 then
    raise exception 'CODE_TOO_SHORT';
  end if;

  if length(coalesce(p_passcode, '')) < 4 then
    raise exception 'PASSCODE_TOO_SHORT';
  end if;

  if exists (select 1 from public.workspaces w where w.code = v_code) then
    raise exception 'CODE_TAKEN';
  end if;

  insert into public.workspaces (code, passcode_hash, name)
  values (v_code, extensions.crypt(p_passcode, extensions.gen_salt('bf')), p_name)
  returning workspaces.id into v_id;

  return query
    select w.id, w.name, w.code, private.lp_issue_workspace_token(w.id)
      from public.workspaces w
     where w.id = v_id;
end;
$$;

revoke all on function private.lp_create_workspace_impl(text, text, text) from public;
grant execute on function private.lp_create_workspace_impl(text, text, text) to anon, authenticated;

create or replace function private.lp_verify_passcode_impl(
  p_code text,
  p_passcode text
)
returns table (id uuid, name text, code text, access_token text)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_code text := lower(trim(p_code));
begin
  return query
    select w.id, w.name, w.code, private.lp_issue_workspace_token(w.id)
      from public.workspaces w
     where w.code = v_code
       and w.passcode_hash = extensions.crypt(p_passcode, w.passcode_hash);
end;
$$;

revoke all on function private.lp_verify_passcode_impl(text, text) from public;
grant execute on function private.lp_verify_passcode_impl(text, text) to anon, authenticated;

create or replace function private.lp_list_chores_impl(
  p_access_token text
)
returns setof public.chores
language sql
security definer
set search_path = public
as $$
  select c.*
    from public.chores c
    join public.workspace_tokens t on t.workspace_id = c.workspace_id
   where t.token = p_access_token
   order by c.start_at, c.updated_at;
$$;

revoke all on function private.lp_list_chores_impl(text) from public;
grant execute on function private.lp_list_chores_impl(text) to anon, authenticated;

create or replace function private.lp_upsert_chore_impl(
  p_access_token text,
  p_id uuid,
  p_title text,
  p_notes text,
  p_icon_key text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_column_id text,
  p_remind_whats_app boolean,
  p_remind_at timestamptz,
  p_updated_by text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  select t.workspace_id
    into v_workspace_id
    from public.workspace_tokens t
   where t.token = p_access_token;

  if v_workspace_id is null then
    raise exception 'TOKEN_INVALID';
  end if;

  if p_end_at <= p_start_at then
    raise exception 'INVALID_TIME_RANGE';
  end if;

  insert into public.chores (
    id,
    workspace_id,
    title,
    notes,
    icon_key,
    start_at,
    end_at,
    column_id,
    remind_whats_app,
    remind_at,
    updated_at,
    updated_by
  )
  values (
    p_id,
    v_workspace_id,
    p_title,
    coalesce(p_notes, ''),
    coalesce(p_icon_key, 'home'),
    p_start_at,
    p_end_at,
    p_column_id,
    coalesce(p_remind_whats_app, false),
    p_remind_at,
    now(),
    coalesce(p_updated_by, '')
  )
  on conflict (id) do update
    set title = excluded.title,
        notes = excluded.notes,
        icon_key = excluded.icon_key,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        column_id = excluded.column_id,
        remind_whats_app = excluded.remind_whats_app,
        remind_at = excluded.remind_at,
        updated_at = now(),
        updated_by = excluded.updated_by
  where public.chores.workspace_id = v_workspace_id;

  if not found then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

revoke all on function private.lp_upsert_chore_impl(text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text) from public;
grant execute on function private.lp_upsert_chore_impl(text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text) to anon, authenticated;

create or replace function private.lp_delete_chore_impl(
  p_access_token text,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  select t.workspace_id
    into v_workspace_id
    from public.workspace_tokens t
   where t.token = p_access_token;

  if v_workspace_id is null then
    raise exception 'TOKEN_INVALID';
  end if;

  delete from public.chores
   where id = p_id
     and workspace_id = v_workspace_id;
end;
$$;

revoke all on function private.lp_delete_chore_impl(text, uuid) from public;
grant execute on function private.lp_delete_chore_impl(text, uuid) to anon, authenticated;

-- =========================================================================
-- Wrappers públicas
-- =========================================================================

create or replace function public.lp_create_workspace(
  p_code text,
  p_passcode text,
  p_name text default 'Casa'
)
returns table (id uuid, name text, code text, access_token text)
language sql
security invoker
set search_path = public, private
as $$
  select * from private.lp_create_workspace_impl(p_code, p_passcode, p_name);
$$;

revoke all on function public.lp_create_workspace(text, text, text) from public;
grant execute on function public.lp_create_workspace(text, text, text) to anon, authenticated;

create or replace function public.lp_verify_passcode(
  p_code text,
  p_passcode text
)
returns table (id uuid, name text, code text, access_token text)
language sql
security invoker
set search_path = public, private
as $$
  select * from private.lp_verify_passcode_impl(p_code, p_passcode);
$$;

revoke all on function public.lp_verify_passcode(text, text) from public;
grant execute on function public.lp_verify_passcode(text, text) to anon, authenticated;

create or replace function public.lp_list_chores(
  p_access_token text
)
returns setof public.chores
language sql
security invoker
set search_path = public, private
as $$
  select * from private.lp_list_chores_impl(p_access_token);
$$;

revoke all on function public.lp_list_chores(text) from public;
grant execute on function public.lp_list_chores(text) to anon, authenticated;

create or replace function public.lp_upsert_chore(
  p_access_token text,
  p_id uuid,
  p_title text,
  p_notes text,
  p_icon_key text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_column_id text,
  p_remind_whats_app boolean,
  p_remind_at timestamptz,
  p_updated_by text
)
returns void
language sql
security invoker
set search_path = public, private
as $$
  select private.lp_upsert_chore_impl(
    p_access_token,
    p_id,
    p_title,
    p_notes,
    p_icon_key,
    p_start_at,
    p_end_at,
    p_column_id,
    p_remind_whats_app,
    p_remind_at,
    p_updated_by
  );
$$;

revoke all on function public.lp_upsert_chore(text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text) from public;
grant execute on function public.lp_upsert_chore(text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text) to anon, authenticated;

create or replace function public.lp_delete_chore(
  p_access_token text,
  p_id uuid
)
returns void
language sql
security invoker
set search_path = public, private
as $$
  select private.lp_delete_chore_impl(p_access_token, p_id);
$$;

revoke all on function public.lp_delete_chore(text, uuid) from public;
grant execute on function public.lp_delete_chore(text, uuid) to anon, authenticated;
