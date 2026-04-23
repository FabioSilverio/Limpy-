import { useCallback, useState } from 'react'
import type { AppSettings, Chore } from '../types'
import { defaultSettings } from '../types'

const CHORES_KEY = 'limpy:chores:v1'
const SETTINGS_KEY = 'limpy:settings:v1'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function useChores() {
  const [chores, setChores] = useState<Chore[]>(() => load<Chore[]>(CHORES_KEY, []))

  const persist = useCallback((next: Chore[]) => {
    setChores(next)
    save(CHORES_KEY, next)
  }, [])

  return { chores, setChores: persist }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() => ({
    ...defaultSettings(),
    ...load<Partial<AppSettings>>(SETTINGS_KEY, {}),
  }))

  const setSettings = useCallback((up: Partial<AppSettings> | ((s: AppSettings) => AppSettings)) => {
    setSettingsState((s) => {
      const n = typeof up === 'function' ? up(s) : { ...s, ...up }
      save(SETTINGS_KEY, n)
      return n
    })
  }, [])

  return { settings, setSettings }
}
