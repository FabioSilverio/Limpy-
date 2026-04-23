import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import type { ColumnId, Chore } from '../types'
import { ChoreCard } from './ChoreCard'

const COLUMNS: { id: ColumnId; title: string; subtitle: string; accent: string }[] = [
  { id: 'backlog', title: 'A fazer', subtitle: 'Fila', accent: 'from-indigo-500/20 to-slate-900/0' },
  { id: 'doing', title: 'Em andamento', subtitle: 'Agora', accent: 'from-amber-500/20 to-slate-900/0' },
  { id: 'done', title: 'Feito', subtitle: 'Concluído', accent: 'from-emerald-500/20 to-slate-900/0' },
]

function byColumn(chores: Chore[], col: ColumnId) {
  return [...chores]
    .filter((c) => c.columnId === col)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
}

function DraggableChoreItem({
  chore,
  onOpen,
}: {
  chore: Chore
  onOpen: (c: Chore) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: chore.id,
    data: { type: 'chore' as const, chore },
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="touch-pan-y"
      {...listeners}
      {...attributes}
    >
      <ChoreCard
        chore={chore}
        onClick={() => onOpen(chore)}
        isDragging={isDragging}
      />
    </div>
  )
}

function ColumnDrop({
  col,
  children,
  count,
}: {
  col: (typeof COLUMNS)[number]
  children: ReactNode
  count: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id, data: { type: 'column' as const } })
  return (
    <section
      ref={setNodeRef}
      className={[
        'flex min-h-[280px] min-w-[min(100%,280px)] flex-1 flex-col rounded-2xl border bg-slate-900/40 backdrop-blur-sm transition-colors',
        isOver ? 'border-teal-500/60 ring-1 ring-teal-500/30' : 'border-slate-700/60',
      ].join(' ')}
    >
      <header
        className={`rounded-t-2xl bg-gradient-to-br ${col.accent} border-b border-slate-700/50 px-3 py-2.5`}
      >
        <h2 className="text-sm font-bold text-slate-100">{col.title}</h2>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          {col.subtitle} · {count}
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-2 overflow-y-auto max-h-[min(70dvh,520px)] scroller">
        {children}
      </div>
    </section>
  )
}

type Props = {
  chores: Chore[]
  onUpdateChores: (chores: Chore[]) => void
  onOpenChore: (c: Chore) => void
}

const COL_IDS: ColumnId[] = ['backlog', 'doing', 'done']

function resolveTargetColumn(overId: string, chores: Chore[], activeChore: Chore): ColumnId | null {
  if (COL_IDS.includes(overId as ColumnId)) {
    return overId as ColumnId
  }
  const overChore = chores.find((c) => c.id === overId)
  if (overChore) return overChore.columnId
  return activeChore.columnId
}

export function KanbanBoard({ chores, onUpdateChores, onOpenChore }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeChore = chores.find((c) => c.id === activeId)
    if (!activeChore) return
    const target = resolveTargetColumn(overId, chores, activeChore)
    if (target && target !== activeChore.columnId) {
      onUpdateChores(chores.map((c) => (c.id === activeId ? { ...c, columnId: target } : c)))
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 scroller overflow-x-auto pb-2 -mx-1 px-1 sm:mx-0 sm:px-0">
        {COLUMNS.map((col) => {
          const list = byColumn(chores, col.id)
          return (
            <ColumnDrop key={col.id} col={col} count={list.length}>
              {list.map((c) => (
                <DraggableChoreItem key={c.id} chore={c} onOpen={onOpenChore} />
              ))}
              {list.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-600">Solte tarefas aqui</p>
              )}
            </ColumnDrop>
          )
        })}
      </div>
    </DndContext>
  )
}
