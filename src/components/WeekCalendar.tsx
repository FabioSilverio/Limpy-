import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AppSettings, Chore } from '../types'
import { getChoreIcon } from '../lib/choreIcons'
import { hexWithAlpha, resolveChoreColor } from '../lib/colors'
import { expandRecurrence } from '../lib/recurrence'
import { clsx } from 'clsx'

const HOUR_PX = 44
const MIN_DAY_WIDTH = 170
const LANE_WIDTH_PX = 180
const MAX_DAY_WIDTH = 900

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
      zIndex: number
      leftPct: number
      widthPct: number
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

    let maxConcurrent = 1

    const items = groups.flatMap((group) => {
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
      maxConcurrent = Math.max(maxConcurrent, totalColumns)

      return withColumns.map((item) => {
        const sh = item.start.getHours() + item.start.getMinutes() / 60
        const eh = item.end.getHours() + item.end.getMinutes() / 60
        const top = Math.max(0, (sh - dayStartHour) * HOUR_PX)
        const endOffset = (eh - dayStartHour) * HOUR_PX
        const height = Math.max(34, endOffset - top)
        const color = resolveChoreColor(item.ch.color, item.ch.iconKey)
        return {
          ch: item.ch,
          top,
          height,
          color,
          Icon: getChoreIcon(item.ch.iconKey),
          zIndex: 10 + item.column,
          leftPct: item.column * (100 / totalColumns),
          widthPct: 100 / totalColumns,
        } satisfies LayoutItem
      })
    })

    return { items, maxConcurrent }
  }

  const dayLayouts = new Map(
    days.map((day) => {
      const data = layoutForDay(day)
      const dayWidth = Math.max(MIN_DAY_WIDTH, Math.min(MAX_DAY_WIDTH, data.maxConcurrent * LANE_WIDTH_PX))
      return [day.toISOString(), { ...data, dayWidth }] as const
    }),
  )

  const dayWidths = days.map((day) => dayLayouts.get(day.toISOString())?.dayWidth ?? MIN_DAY_WIDTH)
  const totalGridWidth = 40 + dayWidths.reduce((sum, w) => sum + w, 0)

  return (
    <section className="w-full max-w-full overflow-hidden rounded-[2rem] bg-white/90 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-4">
      <div className="rounded-[1.6rem] bg-gradient-to-br from-lime-200 via-sky-100 to-violet-100 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                {format(start, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <button
                type="button"
                onClick={() => onWeekAnchor(startOfWeek(new Date(), { weekStartsOn }))}
                className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white shadow-sm"
              >
                Hoje
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {format(start, 'd MMM', { locale: ptBR })} -{' '}
              {format(weekEnd, 'd MMM yyyy', { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="flex rounded-full bg-white/55 p-1 shadow-sm backdrop-blur">
              <span className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500">Mês</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-950 shadow-sm">
                Semana
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500">Dia</span>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onWeekAnchor(addDays(weekAnchor, -7))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-lg font-bold text-slate-800 shadow-sm"
                aria-label="Semana anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => onWeekAnchor(addDays(weekAnchor, 7))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-lg font-bold text-slate-800 shadow-sm"
                aria-label="Próxima semana"
              >
                ›
              </button>
            </div>
          </div>
        </div>

      </div>

      <div className="scroller overflow-x-auto rounded-[1.6rem] bg-white">
        <div
          className="sticky top-0 z-30 grid gap-1 border-b border-slate-100 bg-white p-1"
          style={{
            gridTemplateColumns: `40px ${dayWidths.map((w) => `${w}px`).join(' ')}`,
            minWidth: `${totalGridWidth}px`,
          }}
        >
          <div className="flex h-14 items-center justify-center rounded-2xl bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
            GMT-3
          </div>
          {days.map((day) => (
            <div
              key={`head-${day.toISOString()}`}
              className={clsx(
                'flex h-14 flex-col items-center justify-center rounded-2xl text-center shadow-sm',
                isToday(day) ? 'bg-lime-200 text-slate-950' : 'bg-slate-100 text-slate-700',
              )}
            >
              <span className="text-[10px] font-semibold lowercase">{format(day, 'EEE', { locale: ptBR })}</span>
              <span className="text-2xl font-black leading-none">{format(day, 'd')}</span>
            </div>
          ))}
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `40px ${dayWidths.map((w) => `${w}px`).join(' ')}`,
            minWidth: `${totalGridWidth}px`,
          }}
        >
          <div className="border-r border-slate-200" aria-hidden>
            {hours.map((h) => (
              <div
                key={h}
                className="border-b border-slate-100 pr-2 pt-1 text-right text-[11px] font-medium text-slate-400"
                style={{ height: HOUR_PX }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.toISOString()} className="border-l border-slate-100">
              {(() => {
                const dayKey = day.toISOString()
                const dayData = dayLayouts.get(dayKey)
                if (!dayData) return null
                return (
                  <>
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
                      className="absolute left-0 right-0 border-b border-slate-100"
                      style={{ top: (h - dayStartHour) * HOUR_PX, height: HOUR_PX }}
                    >
                      <button
                        type="button"
                        onClick={() => onSlotClick(day, h, 0)}
                        className="h-full w-full cursor-pointer rounded-md opacity-0 hover:bg-lime-200/40 hover:opacity-100"
                        title="Criar tarefa"
                      />
                    </div>
                  )
                })}

                {dayData.items.map(({ ch, top, height, color, Icon, zIndex, leftPct, widthPct }) => (
                  <button
                    type="button"
                    key={ch.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onChoreClick(ch)
                    }}
                    className={clsx(
                      'absolute flex flex-col items-start overflow-hidden',
                      'rounded-2xl border px-2 py-1 text-left shadow-sm transition',
                      'hover:z-50 hover:scale-[1.015] hover:shadow-lg',
                    )}
                    style={{
                      top,
                      height,
                      minHeight: 34,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      zIndex,
                      borderColor: hexWithAlpha(color, 0.28),
                      backgroundColor: hexWithAlpha(color, 0.18),
                    }}
                    title={`${ch.title} · ${format(parseISO(ch.startAt), 'HH:mm', { locale: ptBR })} - ${format(parseISO(ch.endAt), 'HH:mm', { locale: ptBR })}`}
                  >
                    <span className="flex w-full min-w-0 items-center gap-1">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                      <span className="line-clamp-2 text-xs font-bold leading-tight text-slate-800">
                        {ch.title}
                      </span>
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium text-slate-500">
                      {format(parseISO(ch.startAt), 'HH:mm', { locale: ptBR })} –{' '}
                      {format(parseISO(ch.endAt), 'HH:mm', { locale: ptBR })}
                    </span>
                  </button>
                ))}
              </div>
                  </>
                )
              })()}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
