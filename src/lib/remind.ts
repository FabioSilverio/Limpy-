import { addMinutes, parseISO, isValid } from 'date-fns'
import type { Chore } from '../types'
import { defaultChoreDurationMin } from '../types'

export { defaultChoreDurationMin }

export function defaultRemindTimeIso(ch: Chore): string | null {
  const s = parseISO(ch.startAt)
  if (!isValid(s)) return null
  return addMinutes(s, -15).toISOString()
}

export function addMinutesToIso(iso: string, min: number): string | null {
  const s = parseISO(iso)
  if (!isValid(s)) return null
  return addMinutes(s, min).toISOString()
}
