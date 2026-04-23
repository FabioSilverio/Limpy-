// Feed ICS público por workspace. O Google Agenda pode assinar essa URL
// e atualizar automaticamente as tarefas do Limpy.
//
// Uso: https://<dominio-vercel>/api/ical?token=<access_token>

export const config = { runtime: 'edge' }

interface ChoreRow {
  id: string
  title: string
  notes: string | null
  start_at: string
  end_at: string
  recurrence_type: 'none' | 'daily' | 'weekdays' | 'weekly' | null
  recurrence_until: string | null
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toIcsDate(iso: string) {
  const d = new Date(iso)
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

function rruleFor(recurrence: ChoreRow['recurrence_type'], until: string | null) {
  let base: string | null = null
  if (recurrence === 'daily') base = 'FREQ=DAILY'
  else if (recurrence === 'weekdays') base = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
  else if (recurrence === 'weekly') base = 'FREQ=WEEKLY'
  if (!base) return null
  if (until) {
    const d = new Date(until)
    d.setUTCHours(23, 59, 59, 0)
    base += `;UNTIL=${toIcsDate(d.toISOString())}`
  }
  return base
}

function escapeIcs(v: string) {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function buildIcs(rows: ChoreRow[], name: string) {
  const now = toIcsDate(new Date().toISOString())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Limpy//Home calendar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(name)}`,
    `X-WR-TIMEZONE:UTC`,
  ]
  for (const r of rows) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${r.id}@limpy`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART:${toIcsDate(r.start_at)}`)
    lines.push(`DTEND:${toIcsDate(r.end_at)}`)
    lines.push(`SUMMARY:${escapeIcs(r.title)}`)
    if (r.notes) lines.push(`DESCRIPTION:${escapeIcs(r.notes)}`)
    const rr = rruleFor(r.recurrence_type, r.recurrence_until)
    if (rr) lines.push(`RRULE:${rr}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''
  const name = url.searchParams.get('name') ?? 'Limpy'

  if (!token) {
    return new Response('missing token', { status: 400 })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return new Response('supabase not configured', { status: 500 })
  }

  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/lp_list_chores`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_access_token: token }),
  })

  if (!rpcRes.ok) {
    const text = await rpcRes.text()
    return new Response(`supabase error: ${text}`, { status: rpcRes.status })
  }

  const rows = (await rpcRes.json()) as ChoreRow[]
  const ics = buildIcs(rows, name)

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
