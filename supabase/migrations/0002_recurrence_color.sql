-- Limpy: adiciona recorrência e cor às tarefas.
-- Rode este arquivo inteiro no SQL Editor do Supabase depois de 0001_init.sql.

-- =========================================================================
-- Colunas novas
-- =========================================================================

alter table public.chores
  add column if not exists recurrence_type text not null default 'none'
    check (recurrence_type in ('none', 'daily', 'weekdays', 'weekly'));

alter table public.chores
  add column if not exists recurrence_until timestamptz;

alter table public.chores
  add column if not exists color text;

-- =========================================================================
-- RPC atualizado (drop + recria para mudar assinatura)
-- =========================================================================

drop function if exists public.lp_upsert_chore(text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text);
drop function if exists private.lp_upsert_chore_impl(text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text);

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
  p_updated_by text,
  p_recurrence_type text,
  p_recurrence_until timestamptz,
  p_color text
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
    updated_by,
    recurrence_type,
    recurrence_until,
    color
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
    coalesce(p_updated_by, ''),
    coalesce(p_recurrence_type, 'none'),
    p_recurrence_until,
    p_color
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
        updated_by = excluded.updated_by,
        recurrence_type = excluded.recurrence_type,
        recurrence_until = excluded.recurrence_until,
        color = excluded.color
  where public.chores.workspace_id = v_workspace_id;

  if not found then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

revoke all on function private.lp_upsert_chore_impl(
  text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text, text, timestamptz, text
) from public;
grant execute on function private.lp_upsert_chore_impl(
  text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text, text, timestamptz, text
) to anon, authenticated;

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
  p_updated_by text,
  p_recurrence_type text,
  p_recurrence_until timestamptz,
  p_color text
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
    p_updated_by,
    p_recurrence_type,
    p_recurrence_until,
    p_color
  );
$$;

revoke all on function public.lp_upsert_chore(
  text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text, text, timestamptz, text
) from public;
grant execute on function public.lp_upsert_chore(
  text, uuid, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz, text, text, timestamptz, text
) to anon, authenticated;
