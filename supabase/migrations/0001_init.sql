-- Limpy: workspaces compartilhados por código + senha (sem auth de usuário)
-- Cole tudo no SQL Editor do Supabase e clique em "Run".

create extension if not exists pgcrypto;

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

create table if not exists public.chores (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  notes text not null default '',
  icon_key text not null default 'home',
  start_at timestamptz not null,
  end_at timestamptz not null,
  column_id text not null check (column_id in ('backlog','doing','done')),
  remind_whats_app boolean not null default false,
  remind_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create index if not exists chores_workspace_id_idx on public.chores(workspace_id);
create index if not exists chores_start_at_idx on public.chores(start_at);

-- =========================================================================
-- RLS
-- O ID do workspace é um UUID secreto. Quem tem o código + senha consegue
-- pegá-lo via verify_passcode() (security definer); somente quem tem o UUID
-- consegue ler/escrever em chores.
-- =========================================================================

alter table public.workspaces enable row level security;
alter table public.chores enable row level security;

-- Workspaces: acesso direto bloqueado (uso obrigatório das RPCs).
drop policy if exists workspaces_no_direct_select on public.workspaces;
drop policy if exists workspaces_no_direct_insert on public.workspaces;
drop policy if exists workspaces_no_direct_update on public.workspaces;
drop policy if exists workspaces_no_direct_delete on public.workspaces;

create policy workspaces_no_direct_select on public.workspaces for select using (false);
create policy workspaces_no_direct_insert on public.workspaces for insert with check (false);
create policy workspaces_no_direct_update on public.workspaces for update using (false);
create policy workspaces_no_direct_delete on public.workspaces for delete using (false);

-- Chores: liberadas para anon (defesa via UUID-secreto do workspace).
drop policy if exists chores_anon_all on public.chores;
create policy chores_anon_all on public.chores
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- =========================================================================
-- RPCs
-- =========================================================================

-- Cria workspace e devolve { id, name, code }.
create or replace function public.lp_create_workspace(
  p_code text,
  p_passcode text,
  p_name text default 'Casa'
)
returns table (id uuid, name text, code text)
language plpgsql
security definer
set search_path = public
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
  values (v_code, crypt(p_passcode, gen_salt('bf', 8)), p_name)
  returning workspaces.id into v_id;

  return query
    select w.id, w.name, w.code from public.workspaces w where w.id = v_id;
end;
$$;

revoke all on function public.lp_create_workspace(text, text, text) from public;
grant execute on function public.lp_create_workspace(text, text, text) to anon, authenticated;

-- Verifica código + senha; devolve { id, name, code } se OK; senão zero linhas.
create or replace function public.lp_verify_passcode(
  p_code text,
  p_passcode text
)
returns table (id uuid, name text, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := lower(trim(p_code));
begin
  return query
    select w.id, w.name, w.code
      from public.workspaces w
     where w.code = v_code
       and w.passcode_hash = crypt(p_passcode, w.passcode_hash);
end;
$$;

revoke all on function public.lp_verify_passcode(text, text) from public;
grant execute on function public.lp_verify_passcode(text, text) to anon, authenticated;

-- =========================================================================
-- REALTIME
-- =========================================================================

alter publication supabase_realtime add table public.chores;
