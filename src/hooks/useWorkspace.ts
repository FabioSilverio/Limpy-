import { useCallback, useEffect, useState } from 'react'
import {
  createWorkspace,
  joinWorkspace,
  type Workspace,
} from '../lib/workspaceClient'

const WS_KEY = 'limpy:workspace:v1'

type Stored = { id: string; code: string; name: string }

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(WS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Stored
  } catch {
    return null
  }
}

function save(w: Stored | null) {
  if (!w) localStorage.removeItem(WS_KEY)
  else localStorage.setItem(WS_KEY, JSON.stringify(w))
}

export function useWorkspace() {
  const [workspace, setWorkspaceState] = useState<Workspace | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setWorkspaceState(load())
    setHydrated(true)
  }, [])

  const setWorkspace = useCallback((w: Workspace | null) => {
    setWorkspaceState(w)
    save(w)
  }, [])

  const join = useCallback(
    async (code: string, passcode: string) => {
      const w = await joinWorkspace(code, passcode)
      if (!w) return null
      setWorkspace(w)
      return w
    },
    [setWorkspace],
  )

  const create = useCallback(
    async (code: string, passcode: string, name: string) => {
      const w = await createWorkspace(code, passcode, name)
      setWorkspace(w)
      return w
    },
    [setWorkspace],
  )

  const leave = useCallback(() => setWorkspace(null), [setWorkspace])

  return { workspace, hydrated, join, create, leave }
}
