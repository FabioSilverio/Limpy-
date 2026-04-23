import { addDays, differenceInCalendarDays, getDay } from 'date-fns'
import type { Chore, RecurrenceType } from '../types'

export interface RecurrenceOption {
  value: RecurrenceType
  label: string
}

export const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  { value: 'none', label: 'Nunca (só uma vez)' },
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekdays', label: 'Toda segunda a sexta' },
  { value: 'weekly', label: 'Toda semana no mesmo dia' },
]

export function recurrenceLabel(type: RecurrenceType) {
  return RECURRENCE_OPTIONS.find((o) => o.value === type)?.label ?? 'Nunca (só uma vez)'
}

/**
 * Gera ocorrências de uma tarefa recorrente dentro do intervalo [from, to].
 * Quando a tarefa não é recorrente (`recurrence === 'none'`), devolve `[chore]`
 * caso caia dentro do intervalo.
 *
 * Cada ocorrência é uma cópia "virtual" com `id = ${chore.id}::${dateKey}` e
 * novas datas. A coluna (kanban) e demais metadados são preservados. Não
 * persistimos as ocorrências; servem só pro calendário.
 */
export function expandRecurrence(chore: Chore, from: Date, to: Date): Chore[] {
  const start = new Date(chore.startAt)
  const end = new Date(chore.endAt)
  const duration = end.getTime() - start.getTime()

  const untilDate = chore.recurrenceUntil ? new Date(chore.recurrenceUntil) : null
  const lastAllowed = untilDate && untilDate < to ? untilDate : to

  const occurrences: Chore[] = []

  if (chore.recurrence === 'none') {
    if (start >= from && start <= to) occurrences.push(chore)
    return occurrences
  }

  const first = start <= from ? from : start
  let cursor = new Date(first)
  cursor.setHours(start.getHours(), start.getMinutes(), 0, 0)

  const endGuard = addDays(lastAllowed, 1)

  while (cursor < endGuard) {
    const weekday = getDay(cursor)
    const include =
      cursor >= start &&
      cursor <= lastAllowed &&
      (chore.recurrence === 'daily' ||
        (chore.recurrence === 'weekdays' && weekday >= 1 && weekday <= 5) ||
        (chore.recurrence === 'weekly' && weekday === getDay(start)))

    if (include && cursor >= from) {
      const occurrenceStart = new Date(cursor)
      const occurrenceEnd = new Date(cursor.getTime() + duration)
      const key = occurrenceStart.toISOString().slice(0, 10)
      occurrences.push({
        ...chore,
        id: `${chore.id}::${key}`,
        startAt: occurrenceStart.toISOString(),
        endAt: occurrenceEnd.toISOString(),
      })
    }
    cursor = addDays(cursor, 1)
    if (occurrences.length > 400) break
  }

  return occurrences
}

/** Extrai o id da tarefa base quando o id é virtual (gerado pelo expand). */
export function baseChoreId(id: string) {
  const sep = id.indexOf('::')
  return sep === -1 ? id : id.slice(0, sep)
}

/**
 * Estima a próxima ocorrência >= now para dispositivos de lembrete.
 * Para `recurrence === 'none'`, devolve `chore.startAt`.
 */
export function nextOccurrenceIso(chore: Chore, from: Date = new Date()): string | null {
  if (chore.recurrence === 'none') {
    const start = new Date(chore.startAt)
    return start >= from ? chore.startAt : null
  }
  const start = new Date(chore.startAt)
  if (chore.recurrenceUntil && new Date(chore.recurrenceUntil) < from) return null
  const firstCandidate = from < start ? start : from
  const horizon = addDays(firstCandidate, 365)
  let cursor = new Date(firstCandidate)
  cursor.setHours(start.getHours(), start.getMinutes(), 0, 0)
  if (cursor < firstCandidate) cursor = addDays(cursor, 1)

  while (cursor <= horizon) {
    const weekday = getDay(cursor)
    const match =
      chore.recurrence === 'daily' ||
      (chore.recurrence === 'weekdays' && weekday >= 1 && weekday <= 5) ||
      (chore.recurrence === 'weekly' && weekday === getDay(start))
    if (match) {
      if (chore.recurrenceUntil && cursor > new Date(chore.recurrenceUntil)) return null
      return cursor.toISOString()
    }
    cursor = addDays(cursor, 1)
    if (differenceInCalendarDays(cursor, firstCandidate) > 365) break
  }
  return null
}
