import type { Chore, RecurrenceType } from '../types'

function toGoogleDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function rruleFor(recurrence: RecurrenceType, until: string | null): string | null {
  let base: string | null = null
  if (recurrence === 'daily') base = 'FREQ=DAILY'
  else if (recurrence === 'weekdays') base = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
  else if (recurrence === 'weekly') base = 'FREQ=WEEKLY'
  if (!base) return null
  if (until) {
    const d = new Date(until)
    d.setUTCHours(23, 59, 59, 0)
    base += `;UNTIL=${toGoogleDate(d.toISOString())}`
  }
  return base
}

/**
 * Monta uma URL "Add to Google Calendar" pré-preenchida.
 * Em PWA instalado no celular costuma abrir direto o app do Google Agenda.
 */
export function googleCalendarEventUrl(chore: Chore) {
  const start = toGoogleDate(chore.startAt)
  const end = toGoogleDate(chore.endAt)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: chore.title,
    dates: `${start}/${end}`,
    details: chore.notes || '',
  })
  const rr = rruleFor(chore.recurrence, chore.recurrenceUntil)
  if (rr) params.set('recur', `RRULE:${rr}`)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function escapeIcs(v: string) {
  return v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** Gera um arquivo .ics (texto) com todas as tarefas fornecidas. */
export function buildIcsFromChores(chores: Chore[], calendarName = 'Limpy'): string {
  const now = new Date()
  const dtstamp = toGoogleDate(now.toISOString())

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Limpy//Home calendar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ]

  for (const c of chores) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${c.id}@limpy`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART:${toGoogleDate(c.startAt)}`)
    lines.push(`DTEND:${toGoogleDate(c.endAt)}`)
    lines.push(`SUMMARY:${escapeIcs(c.title)}`)
    if (c.notes) lines.push(`DESCRIPTION:${escapeIcs(c.notes)}`)
    const rr = rruleFor(c.recurrence, c.recurrenceUntil)
    if (rr) lines.push(`RRULE:${rr}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

export function downloadIcsFile(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
