import {
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
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
  { id: 'backlog', title: 'A fazer', subtitle: 'Fila', accent: 'from-violet-100 to-white' },
  { id: 'doing', title: 'Em andamento', subtitle: 'Agora', accent: 'from-amber-100 to-white' },
  { id: 'done', title: 'Feito', subtitle: 'Concluído', accent: 'from-lime-100 to-white' },
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

  const style = transform
    ? { transform: CSS.Translate.toString(transform), touchAction: 'none' as const }
    : { touchAction: 'none' as const }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ChoreCard chore={chore} onClick={() => onOpen(chore)} isDragging={isDragging} />
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
        'flex min-h-[280px] min-w-[min(100%,280px)] flex-1 flex-col rounded-3xl border bg-white/70 backdrop-blur-sm transition-colors',
        isOver ? 'border-lime-400 ring-2 ring-lime-200' : 'border-slate-200',
      ].join(' ')}
    >
      <header
        className={`rounded-t-3xl bg-gradient-to-br ${col.accent} border-b border-slate-100 px-3 py-2.5`}
      >
        <h2 className="text-sm font-bold text-slate-950">{col.title}</h2>
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
  currentUser: string
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

export function KanbanBoard({ chores, currentUser, onUpdateChores, onOpenChore }: Props) {
  // Mouse para desktop (distance pequena = responsivo), Touch com pequeno delay
  // pra deixar o navegador diferenciar scroll vertical de arrasto.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
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
      onUpdateChores(
        chores.map((c) => (c.id === activeId ? { ...c, columnId: target, updatedBy: currentUser } : c)),
      )
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
