import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { getChoreIcon } from '../lib/choreIcons'
import { choreColorStyles, hexWithAlpha, resolveChoreColor } from '../lib/colors'
import type { Chore } from '../types'
import { clsx } from 'clsx'
import { MessageCircle, Repeat } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { recurrenceLabel } from '../lib/recurrence'

type Props = {
  chore: Chore
  onClick?: () => void
  compact?: boolean
  dragListeners?: DraggableSyntheticListeners
  dragAttributes?: DraggableAttributes
  isDragging?: boolean
}

/* eslint-disable react-hooks/static-components */
function ChoreIcon({ iconKey }: { iconKey: string }) {
  const IconComponent = getChoreIcon(iconKey)
  return <IconComponent className="h-5 w-5" strokeWidth={1.75} />
}
/* eslint-enable react-hooks/static-components */

export function ChoreCard({ chore, onClick, compact, dragListeners, dragAttributes, isDragging }: Props) {
  const start = parseISO(chore.startAt)
  const timeStr = format(start, compact ? 'EEE HH:mm' : 'dd/MM · HH:mm', { locale: ptBR })

  const color = resolveChoreColor(chore.color, chore.iconKey)
  const baseStyles = choreColorStyles(color)
  const iconBg = hexWithAlpha(color, 0.24)
  const iconFg = color

  return (
    <button
      type="button"
      {...dragAttributes}
      {...dragListeners}
      onClick={onClick}
      style={baseStyles}
      className={clsx(
        'w-full text-left rounded-2xl border px-3 py-2.5 transition shadow-sm',
        'hover:brightness-105 active:scale-[0.99]',
        isDragging && 'opacity-50 ring-2 ring-lime-300',
        compact && 'py-2',
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg, color: iconFg }}
          aria-hidden
        >
          <ChoreIcon iconKey={chore.iconKey} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 line-clamp-2">{chore.title}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">{timeStr}</p>
          {chore.notes && !compact && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{chore.notes}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {chore.remindWhatsApp && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700">
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </span>
            )}
            {chore.recurrence !== 'none' && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] text-slate-600"
                title={recurrenceLabel(chore.recurrence)}
              >
                <Repeat className="h-3 w-3" />
                {chore.recurrence === 'daily' && 'Diária'}
                {chore.recurrence === 'weekdays' && 'Seg–Sex'}
                {chore.recurrence === 'weekly' && 'Semanal'}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
