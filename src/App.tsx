import { useCallback, useEffect, useState } from 'react'
import { addMinutes, setHours, setMinutes, startOfWeek } from 'date-fns'
import { Settings, LayoutGrid, CalendarDays, Plus, LogOut, Users } from 'lucide-react'
import { useSettings } from './hooks/useLocalStore'
import { useChoresSync, loadStoredWorkspace, storeWorkspace } from './hooks/useChoresSync'
import { useReminders } from './hooks/useReminders'
import type { Chore } from './types'
import { WeekCalendar } from './components/WeekCalendar'
import { KanbanBoard } from './components/KanbanBoard'
import { ChoreFormModal } from './components/ChoreFormModal'
import { SettingsSheet } from './components/SettingsSheet'
import { WorkspaceGate } from './components/WorkspaceGate'
import { GamificationPanel } from './components/GamificationPanel'
import type { Workspace } from './lib/workspaceClient'
import { isSupabaseConfigured } from './lib/supabase'
import { buildReminderMessage, openWhatsAppPrefilled } from './lib/whatsapp'
import { baseChoreId } from './lib/recurrence'

type View = 'calendar' | 'board'

type ModalState =
  | { type: 'closed' }
  | { type: 'create'; defaults?: Partial<Chore> }
  | { type: 'edit'; chore: Chore }

type GateState =
  | { kind: 'loading' }
  | { kind: 'gate' }
  | { kind: 'offline' }
  | { kind: 'workspace'; workspace: Workspace; nickname: string }

function readStartState(): GateState {
  if (!isSupabaseConfigured) return { kind: 'offline' }
  const w = loadStoredWorkspace()
  if (w) {
    const nickname = localStorage.getItem('limpy:nickname') ?? 'Alguém'
    return { kind: 'workspace', workspace: w, nickname }
  }
  return { kind: 'gate' }
}

export default function App() {
  const [gate, setGate] = useState<GateState>(() => readStartState())
  const { settings, setSettings } = useSettings()
  const [view, setView] = useState<View>('calendar')
  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: settings.weekStartsOn }),
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>({ type: 'closed' })

  const workspace = gate.kind === 'workspace' ? gate.workspace : null
  const nickname = gate.kind === 'workspace' ? gate.nickname : 'Alguém'

  const { chores, saveOne, removeOne, replaceAll } = useChoresSync(workspace, nickname)

  const onNotify = useCallback(
    (ch: Chore) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        const when = new Date(ch.remindAt ?? ch.startAt).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
        openWhatsAppPrefilled(
          settings.whatsappPhone,
          buildReminderMessage(ch.title, ch.notes, when, settings.labelPartner),
        )
      }
    },
    [settings.whatsappPhone, settings.labelPartner],
  )

  useReminders(chores, settings, onNotify)

  useEffect(() => {
    if (gate.kind === 'workspace') storeWorkspace(gate.workspace)
  }, [gate])

  if (gate.kind === 'gate') {
    return (
      <WorkspaceGate
        onEnter={(w, nn) => {
          storeWorkspace(w)
          localStorage.setItem('limpy:nickname', nn)
          setGate({ kind: 'workspace', workspace: w, nickname: nn })
        }}
        onContinueOffline={() => setGate({ kind: 'offline' })}
      />
    )
  }

  const leaveWorkspace = () => {
    storeWorkspace(null)
    setGate({ kind: 'gate' })
  }

  const openCreate = (defaults?: Partial<Chore>) => setModal({ type: 'create', defaults })

  const openEditFromOccurrence = (c: Chore) => {
    const baseId = baseChoreId(c.id)
    const base = chores.find((x) => x.id === baseId) ?? c
    setModal({ type: 'edit', chore: base })
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1500px] flex-col gap-3 p-3 pb-28 lg:flex-row lg:p-5 lg:pb-5">
      <aside className="rounded-[2rem] bg-slate-950 p-3 text-white shadow-2xl shadow-slate-900/20 lg:sticky lg:top-5 lg:h-[calc(100dvh-2.5rem)] lg:w-80 lg:shrink-0">
        <div className="flex items-center justify-between gap-3 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300 text-2xl font-black text-slate-950">
              L
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Limpy</h1>
              <p className="text-xs text-slate-400">Casa em modo jogo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950 transition hover:scale-105 lg:mt-6 lg:w-full lg:gap-2 lg:px-4"
            aria-label="Nova tarefa"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
            <span className="hidden text-sm font-semibold lg:inline">Nova tarefa</span>
          </button>
        </div>

        <div className="mt-4 rounded-3xl bg-white/8 p-4">
          {workspace ? (
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-lime-200">
                <Users className="h-3.5 w-3.5" />
                Workspace
              </p>
              <p className="text-sm font-semibold text-white">{workspace.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                Código <span className="font-mono text-slate-200">{workspace.code}</span> ·{' '}
                <span className="text-lime-200">{nickname}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-300">Modo offline neste dispositivo.</p>
          )}
        </div>

        <nav className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
          <button
            type="button"
            onClick={() => {
              setView('calendar')
              setWeekAnchor(startOfWeek(weekAnchor, { weekStartsOn: settings.weekStartsOn }))
            }}
            className={[
              'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition lg:justify-start',
              view === 'calendar'
                ? 'bg-lime-300 text-slate-950'
                : 'bg-white/8 text-slate-300 hover:bg-white/12',
            ].join(' ')}
          >
            <CalendarDays className="h-4 w-4" />
            Calendário
          </button>
          <button
            type="button"
            onClick={() => setView('board')}
            className={[
              'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition lg:justify-start',
              view === 'board'
                ? 'bg-lime-300 text-slate-950'
                : 'bg-white/8 text-slate-300 hover:bg-white/12',
            ].join(' ')}
          >
            <LayoutGrid className="h-4 w-4" />
            Quadro
          </button>
        </nav>

        <div className="mt-4 flex gap-2">
          {workspace && (
            <button
              type="button"
              onClick={leaveWorkspace}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white/8 px-3 py-2.5 text-sm text-slate-200 transition hover:bg-white/12"
              title="Sair do workspace"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white/8 px-3 py-2.5 text-sm text-slate-200 transition hover:bg-white/12"
          >
            <Settings className="h-4 w-4" />
            Ajustes
          </button>
        </div>

        <div className="mt-4">
          <GamificationPanel chores={chores} currentUser={nickname} />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {view === 'calendar' && (
          <WeekCalendar
            weekAnchor={weekAnchor}
            onWeekAnchor={setWeekAnchor}
            chores={chores}
            settings={settings}
            onSlotClick={(day, h, m) => {
              const t = setMinutes(setHours(day, h), m)
              const end = addMinutes(t, 60)
              openCreate({
                startAt: t.toISOString(),
                endAt: end.toISOString(),
                remindAt: addMinutes(t, -15).toISOString(),
              })
            }}
            onChoreClick={openEditFromOccurrence}
          />
        )}
        {view === 'board' && (
          <section className="rounded-[2rem] bg-white/88 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-5">
            <KanbanBoard
              chores={chores}
              currentUser={nickname}
              onUpdateChores={replaceAll}
              onOpenChore={(c) => setModal({ type: 'edit', chore: c })}
            />
          </section>
        )}
      </main>

      <div className="fixed bottom-6 right-4 z-30 lg:hidden">
        <button
          type="button"
          onClick={() => openCreate()}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-lime-200 shadow-lg shadow-slate-900/30 transition hover:scale-105 active:scale-95"
          aria-label="Nova tarefa"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
      </div>

      <ChoreFormModal
        key={
          modal.type === 'edit'
            ? `edit:${modal.chore.id}`
            : modal.type === 'create'
              ? `create:${modal.defaults?.startAt ?? 'new'}:${modal.defaults?.endAt ?? 'new'}`
              : 'closed'
        }
        open={modal.type !== 'closed'}
        mode={
          modal.type === 'create'
            ? { type: 'create', defaults: modal.defaults }
            : modal.type === 'edit'
              ? { type: 'edit', chore: modal.chore }
              : { type: 'create' }
        }
        onClose={() => setModal({ type: 'closed' })}
        onSave={(c) => {
          saveOne({ ...c, updatedBy: nickname })
          setModal({ type: 'closed' })
        }}
        onDelete={(id) => {
          removeOne(id)
          setModal({ type: 'closed' })
        }}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
        onRequestNotification={() => {
          if (!('Notification' in window)) return
          void Notification.requestPermission()
        }}
        workspace={workspace}
        chores={chores}
      />
    </div>
  )
}
