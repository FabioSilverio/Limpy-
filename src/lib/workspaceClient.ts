import { supabase } from './supabase'
import type { Chore } from '../types'

export type Workspace = { id: string; code: string; name: string; access_token: string }

export interface RemoteChoreRow {
  id: string
  workspace_id: string
  title: string
  notes: string
  icon_key: string
  start_at: string
  end_at: string
  column_id: 'backlog' | 'doing' | 'done'
  remind_whats_app: boolean
  remind_at: string | null
  updated_at: string
  updated_by: string
}

export function rowToChore(r: RemoteChoreRow): Chore {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    iconKey: r.icon_key,
    startAt: r.start_at,
    endAt: r.end_at,
    columnId: r.column_id,
    remindWhatsApp: r.remind_whats_app,
    remindAt: r.remind_at,
  }
}

export async function createWorkspace(
  code: string,
  passcode: string,
  name: string,
): Promise<Workspace> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('lp_create_workspace', {
    p_code: code,
    p_passcode: passcode,
    p_name: name,
  })
  if (error) throw error
  const row = (data as Workspace[])[0]
  if (!row) throw new Error('Falha ao criar workspace')
  return row
}

export async function joinWorkspace(code: string, passcode: string): Promise<Workspace | null> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.rpc('lp_verify_passcode', {
    p_code: code,
    p_passcode: passcode,
  })
  if (error) throw error
  const arr = data as Workspace[] | null
  return arr && arr[0] ? arr[0] : null
}

export async function listChores(accessToken: string): Promise<Chore[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('lp_list_chores', {
    p_access_token: accessToken,
  })
  if (error) throw error
  return (data as RemoteChoreRow[]).map(rowToChore)
}

export async function upsertChore(c: Chore, accessToken: string, updatedBy: string) {
  if (!supabase) return
  const { error } = await supabase.rpc('lp_upsert_chore', {
    p_access_token: accessToken,
    p_id: c.id,
    p_title: c.title,
    p_notes: c.notes,
    p_icon_key: c.iconKey,
    p_start_at: c.startAt,
    p_end_at: c.endAt,
    p_column_id: c.columnId,
    p_remind_whats_app: c.remindWhatsApp,
    p_remind_at: c.remindAt,
    p_updated_by: updatedBy,
  })
  if (error) throw error
}

export async function deleteChore(id: string, accessToken: string) {
  if (!supabase) return
  const { error } = await supabase.rpc('lp_delete_chore', {
    p_access_token: accessToken,
    p_id: id,
  })
  if (error) throw error
}
