import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AppSettings, Chore } from '../types'
import { getChoreIcon } from '../lib/choreIcons'
import { hexWithAlpha, resolveChoreColor } from '../lib/colors'
import { expandRecurrence } from '../lib/recurrence'
import { clsx } from 'clsx'

const HOUR_PX = 44

type Props = {
  weekAnchor: Date
  onWeekAnchor: (d: Date) => void
  chores: Chore[]
  settings: AppSettings
  onSlotClick: (day: Date, hour: number, minute: number) => void
  onChoreClick: (c: Chore) => void
}

export function WeekCalendar({
  weekAnchor,
  onWeekAnchor,
  chores,
  settings,
  onSlotClick,
  onChoreClick,
}: Props) {
  const { dayStartHour, dayEndHour, weekStartsOn } = settings
  const start = startOfWeek(weekAnchor, { weekStartsOn })
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn })
  const days = eachDayOfInterval({ start, end: weekEnd })

  const hours: number[] = []
  for (let h = dayStartHour; h < dayEndHour; h++) hours.push(h)

  const totalH = dayEndHour - dayStartHour

  const expandedChores = chores.flatMap((c) => expandRecurrence(c, start, weekEnd))

  function layoutForDay(day: Date) {
    const dayChores = expandedChores
      .filter((c) => isSameDay(parseISO(c.startAt), day))
      .map((ch) => {
        const s = parseISO(ch.startAt)
        const e = parseISO(ch.endAt)
        return {
          ch,
          start: s,
          end: e,
          startMin: s.getHours() * 60 + s.getMinutes(),
          endMin: e.getHours() * 60 + e.getMinutes(),
        }
      })
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

    type LayoutItem = {
      ch: Chore
      top: number
      height: number
      color: string
      Icon: ReturnType<typeof getChoreIcon>
      leftPct: number
      widthPct: number
      zIndex: number
    }

    const groups: (typeof dayChores)[] = []
    let currentGroup: typeof dayChores = []
    let currentGroupEnd = -1

    for (const item of dayChores) {
      if (currentGroup.length === 0 || item.startMin < currentGroupEnd) {
        currentGroup.push(item)
        currentGroupEnd = Math.max(currentGroupEnd, item.endMin)
      } else {
        groups.push(currentGroup)
        currentGroup = [item]
        currentGroupEnd = item.endMin
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup)

    return groups.flatMap((group) => {
      const active: { endMin: number; column: number }[] = []
      const withColumns = group.map((item) => {
        for (let i = active.length - 1; i >= 0; i--) {
          if (active[i].endMin <= item.startMin) active.splice(i, 1)
        }

        let column = 0
        while (active.some((a) => a.column === column)) column++
        active.push({ endMin: item.endMin, column })
        return { ...item, column }
      })

      const totalColumns = Math.max(...withColumns.map((item) => item.column)) + 1

      return withColumns.map((item) => {
        const sh = item.start.getHours() + item.start.getMinutes() / 60
        const eh = item.end.getHours() + item.end.getMinutes() / 60
        const top = Math.max(0, (sh - dayStartHour) * HOUR_PX)
        const endOffset = (eh - dayStartHour) * HOUR_PX
        const height = Math.max(28, endOffset - top)
        const color = resolveChoreColor(item.ch.color, item.ch.iconKey)

        return {
          ch: item.ch,
          top,
          height,
          color,
          Icon: getChoreIcon(item.ch.iconKey),
          leftPct: item.column * (100 / totalColumns),
          widthPct: 100 / totalColumns,
          zIndex: 10 + item.column,
        } satisfies LayoutItem
      })
    })
  }

  return (
    <div className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/30">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 px-3 py-2">
        <button
          type="button"
          onClick={() => onWeekAnchor(addDays(weekAnchor, -7))}
          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
        >
          ← Sem.
        </button>
        <p className="text-sm font-medium text-slate-200">
          {format(start, 'd MMM', { locale: ptBR })} – {format(weekEnd, 'd MMM yyyy', { locale: ptBR })}
        </p>
        <button
          type="button"
          onClick={() => onWeekAnchor(addDays(weekAnchor, 7))}
          className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
        >
          Sem. →
        </button>
      </div>
      <div className="scroller overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `40px repeat(${days.length}, minmax(100px, 1fr))`,
            minWidth: `${40 + days.length * 100}px`,
          }}
        >
          <div className="border-r border-slate-700/50" aria-hidden>
            <div className="h-10" />
            {hours.map((h) => (
              <div
                key={h}
                className="border-b border-slate-800/50 pr-1 text-right text-[10px] text-slate-500"
                style={{ height: HOUR_PX }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.toISOString()} className="border-l border-slate-700/30 min-w-[100px]">
              <div className="sticky top-0 z-20 flex h-10 items-center justify-center border-b border-slate-700/50 bg-slate-900/90 px-1 text-center">
                <div>
                  <p className="text-[10px] uppercase text-slate-500">
                    {format(day, 'EEE', { locale: ptBR })}
                  </p>
                  <p className="text-xs font-semibold text-slate-200">{format(day, 'd/M')}</p>
                </div>
              </div>
              <div
                className="relative"
                style={{ height: totalH * HOUR_PX }}
                role="presentation"
                onKeyDown={() => undefined}
              >
                {hours.map((h) => {
                  return (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-b border-slate-800/40"
                      style={{ top: (h - dayStartHour) * HOUR_PX, height: HOUR_PX }}
                    >
                      <button
                        type="button"
                        onClick={() => onSlotClick(day, h, 0)}
                        className="h-full w-full cursor-pointer rounded-md opacity-0 hover:bg-teal-500/10 hover:opacity-100"
                        title="Criar tarefa"
                      />
                    </div>
                  )
                })}

                {layoutForDay(day).map(({ ch, top, height, color, Icon, leftPct, widthPct, zIndex }) => (
                  <button
                    type="button"
                    key={ch.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onChoreClick(ch)
                    }}
                    className={clsx(
                      'absolute flex flex-col items-start overflow-hidden',
                      'rounded-lg border px-1 py-0.5 text-left shadow',
                      'hover:ring-1 hover:ring-white/40',
                    )}
                    style={{
                      top,
                      height,
                      minHeight: 28,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      zIndex,
                      borderColor: hexWithAlpha(color, 0.7),
                      backgroundColor: hexWithAlpha(color, 0.28),
                    }}
                  >
                    <span className="flex w-full min-w-0 items-center gap-0.5">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                      <span className="truncate text-[10px] font-semibold text-slate-100">{ch.title}</span>
                    </span>
                    <span className="text-[9px] text-slate-200/80">
                      {format(parseISO(ch.startAt), 'HH:mm', { locale: ptBR })} –{' '}
                      {format(parseISO(ch.endAt), 'HH:mm', { locale: ptBR })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
