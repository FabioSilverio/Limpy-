import { useCallback, useEffect, useState } from 'react'
import type { Chore } from '../types'
import { isSupabaseConfigured } from '../lib/supabase'
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
 *  - Com Supabase + workspace: carrega do servidor, faz sync por polling e persiste remoto.
 */
export function useChoresSync(workspace: Workspace | null, updatedBy: string) {
  const [chores, setChores] = useState<Chore[]>(() => loadLocalChores())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !workspace) {
      const timeoutId = window.setTimeout(() => {
        setChores(loadLocalChores())
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }
    let cancelled = false

    const sync = async (isFirstLoad = false) => {
      try {
        if (isFirstLoad) setLoading(true)
        const list = await remoteList(workspace.access_token)
        if (cancelled) return
        setChores(list)
        saveLocalChores(list)
      } catch (err) {
        console.error('Falha ao carregar tarefas remotas', err)
      } finally {
        if (isFirstLoad && !cancelled) setLoading(false)
      }
    }

    void sync(true)
    const interval = window.setInterval(() => {
      void sync(false)
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
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
        ...next.map((c) => remoteUpsert(c, workspace.access_token, updatedBy).catch(console.error)),
        ...toDelete.map((id) => remoteDelete(id, workspace.access_token).catch(console.error)),
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
          await remoteUpsert(c, workspace.access_token, updatedBy)
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
          await remoteDelete(id, workspace.access_token)
        } catch (err) {
          console.error(err)
        }
      }
    },
    [workspace],
  )

  return { chores, loading, saveOne, removeOne, replaceAll }
}
