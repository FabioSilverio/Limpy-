import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { getChoreIcon } from '../lib/choreIcons'
import type { Chore } from '../types'
import { clsx } from 'clsx'
import { MessageCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const columnColors: Record<Chore['columnId'], string> = {
  backlog: 'border-indigo-500/50 bg-indigo-950/40',
  doing: 'border-amber-500/50 bg-amber-950/30',
  done: 'border-emerald-500/50 bg-emerald-950/30',
}

type Props = {
  chore: Chore
  onClick?: () => void
  compact?: boolean
  dragListeners?: DraggableSyntheticListeners
  dragAttributes?: DraggableAttributes
  isDragging?: boolean
}

export function ChoreCard({ chore, onClick, compact, dragListeners, dragAttributes, isDragging }: Props) {
  const Icon = getChoreIcon(chore.iconKey)
  const start = parseISO(chore.startAt)
  const timeStr = format(start, compact ? "EEE HH:mm" : "dd/MM · HH:mm", { locale: ptBR })

  return (
    <button
      type="button"
      {...dragAttributes}
      {...dragListeners}
      onClick={onClick}
      className={clsx(
        'w-full text-left rounded-xl border px-3 py-2.5 transition shadow-sm',
        'hover:brightness-110 active:scale-[0.99]',
        columnColors[chore.columnId],
        isDragging && 'opacity-50 ring-2 ring-teal-400/60',
        compact && 'py-2',
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-teal-300"
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-50 line-clamp-2">{chore.title}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{timeStr}</p>
          {chore.notes && !compact && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{chore.notes}</p>
          )}
          {chore.remindWhatsApp && (
            <span className="inline-flex items-center gap-0.5 mt-1.5 text-[10px] text-emerald-400/90">
              <MessageCircle className="h-3 w-3" />
              Lembrete WhatsApp
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
