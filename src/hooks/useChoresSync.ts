import { useCallback, useEffect, useRef, useState } from 'react'
import type { Chore } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  deleteChore as remoteDelete,
  listChores as remoteList,
  upsertChore as remoteUpsert,
  type Workspace,
} from '../lib/workspaceClient'

const LOCAL_CHORES_KEY = 'limpy:chores:v1'
const WORKSPACE_KEY = 'limpy:workspace:v1'

function loadLocalChores(): Chore[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHORES_KEY)
    return raw ? (JSON.parse(raw) as Chore[]) : []
  } catch {
    return []
  }
}

function saveLocalChores(chores: Chore[]) {
  localStorage.setItem(LOCAL_CHORES_KEY, JSON.stringify(chores))
}

export function loadStoredWorkspace(): Workspace | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY)
    return raw ? (JSON.parse(raw) as Workspace) : null
  } catch {
    return null
  }
}

export function storeWorkspace(w: Workspace | null) {
  if (!w) localStorage.removeItem(WORKSPACE_KEY)
  else localStorage.setItem(WORKSPACE_KEY, JSON.stringify(w))
}

/**
 * Hook central de tarefas.
 *  - Sem Supabase: usa localStorage (modo offline).
 *  - Com Supabase + workspace: carrega do servidor, escuta Realtime, persiste remoto.
 */
export function useChoresSync(workspace: Workspace | null, updatedBy: string) {
  const [chores, setChores] = useState<Chore[]>(() => loadLocalChores())
  const [loading, setLoading] = useState(false)
  const workspaceIdRef = useRef<string | null>(workspace?.id ?? null)
  workspaceIdRef.current = workspace?.id ?? null

  useEffect(() => {
    if (!isSupabaseConfigured || !workspace || !supabase) {
      setChores(loadLocalChores())
      return
    }
    const sb = supabase
    let cancelled = false
    setLoading(true)
    remoteList(workspace.id)
      .then((list) => {
        if (cancelled) return
        setChores(list)
        saveLocalChores(list)
      })
      .catch((err) => {
        console.error('Falha ao carregar tarefas remotas', err)
      })
      .finally(() => !cancelled && setLoading(false))

    const channel = sb
      .channel(`chores:${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chores',
          filter: `workspace_id=eq.${workspace.id}`,
        },
        () => {
          if (cancelled) return
          remoteList(workspace.id)
            .then((list) => {
              if (cancelled) return
              setChores(list)
              saveLocalChores(list)
            })
            .catch((err) => console.error(err))
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      sb.removeChannel(channel)
    }
  }, [workspace])

  const replaceAll = useCallback(
    (next: Chore[]) => {
      setChores(next)
      saveLocalChores(next)

      if (!isSupabaseConfigured || !workspace) return

      const prevIds = new Set(
        (JSON.parse(localStorage.getItem(LOCAL_CHORES_KEY) ?? '[]') as Chore[]).map((c) => c.id),
      )
      const nextIds = new Set(next.map((c) => c.id))
      const toDelete = [...prevIds].filter((id) => !nextIds.has(id))

      Promise.all([
        ...next.map((c) => remoteUpsert(c, workspace.id, updatedBy).catch(console.error)),
        ...toDelete.map((id) => remoteDelete(id).catch(console.error)),
      ]).catch(console.error)
    },
    [workspace, updatedBy],
  )

  const saveOne = useCallback(
    async (c: Chore) => {
      setChores((cur) => {
        const exists = cur.some((x) => x.id === c.id)
        const next = exists ? cur.map((x) => (x.id === c.id ? c : x)) : [...cur, c]
        saveLocalChores(next)
        return next
      })
      if (isSupabaseConfigured && workspace) {
        try {
          await remoteUpsert(c, workspace.id, updatedBy)
        } catch (err) {
          console.error(err)
        }
      }
    },
    [workspace, updatedBy],
  )

  const removeOne = useCallback(
    async (id: string) => {
      setChores((cur) => {
        const next = cur.filter((x) => x.id !== id)
        saveLocalChores(next)
        return next
      })
      if (isSupabaseConfigured && workspace) {
        try {
          await remoteDelete(id)
        } catch (err) {
          console.error(err)
        }
      }
    },
    [workspace],
  )

  return { chores, loading, saveOne, removeOne, replaceAll }
}
