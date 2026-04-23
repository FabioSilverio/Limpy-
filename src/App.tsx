import { useCallback, useState } from 'react'
import { addMinutes, setHours, setMinutes, startOfWeek } from 'date-fns'
import { Settings, LayoutGrid, CalendarDays, Plus } from 'lucide-react'
import { useChores, useSettings } from './hooks/useLocalStore'
import { useReminders } from './hooks/useReminders'
import type { Chore } from './types'
import { WeekCalendar, startOfThisWeek } from './components/WeekCalendar'
import { KanbanBoard } from './components/KanbanBoard'
import { ChoreFormModal } from './components/ChoreFormModal'
import { SettingsSheet } from './components/SettingsSheet'
import { buildReminderMessage, openWhatsAppPrefilled } from './lib/whatsapp'

type View = 'calendar' | 'board'

type ModalState =
  | { type: 'closed' }
  | { type: 'create'; defaults?: Partial<Chore> }
  | { type: 'edit'; chore: Chore }

export default function App() {
  const { chores, setChores } = useChores()
  const { settings, setSettings } = useSettings()
  const [view, setView] = useState<View>('calendar')
  const [weekAnchor, setWeekAnchor] = useState(() => startOfThisWeek(settings.weekStartsOn))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>({ type: 'closed' })

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

  const saveChore = (c: Chore) => {
    const exists = chores.some((x) => x.id === c.id)
    if (exists) {
      setChores(chores.map((x) => (x.id === c.id ? c : x)))
    } else {
      setChores([...chores, c])
    }
    setModal({ type: 'closed' })
  }

  const deleteChore = (id: string) => {
    setChores(chores.filter((c) => c.id !== id))
    setModal({ type: 'closed' })
  }

  const openCreate = (defaults?: Partial<Chore>) => {
    setModal({ type: 'create', defaults })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-3 pb-28 pt-4 sm:px-4 sm:pb-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Limpy</h1>
          <p className="text-sm text-slate-400">Casa, calendário e quadro — juntos.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-600/50 bg-slate-900/50 p-1">
          <button
            type="button"
            onClick={() => {
              setView('calendar')
              setWeekAnchor(startOfWeek(weekAnchor, { weekStartsOn: settings.weekStartsOn }))
            }}
            className={[
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm',
              view === 'calendar' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800',
            ].join(' ')}
          >
            <CalendarDays className="h-4 w-4" />
            Calendário
          </button>
          <button
            type="button"
            onClick={() => setView('board')}
            className={[
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm',
              view === 'board' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800',
            ].join(' ')}
          >
            <LayoutGrid className="h-4 w-4" />
            Quadro
          </button>
        </div>
        <div className="flex w-full justify-end gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
          >
            <Settings className="h-4 w-4" />
            Ajustes
          </button>
        </div>
      </header>

      <main className="flex-1">
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
            onChoreClick={(c) => setModal({ type: 'edit', chore: c })}
          />
        )}
        {view === 'board' && (
          <KanbanBoard
            chores={chores}
            onUpdateChores={setChores}
            onOpenChore={(c) => setModal({ type: 'edit', chore: c })}
          />
        )}
      </main>

      <div className="fixed bottom-6 right-4 z-30 sm:bottom-8 sm:right-8">
        <button
          type="button"
          onClick={() => openCreate()}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg shadow-teal-900/40 transition hover:scale-105 active:scale-95"
          aria-label="Nova tarefa"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
      </div>

      <ChoreFormModal
        open={modal.type !== 'closed'}
        mode={
          modal.type === 'create'
            ? { type: 'create', defaults: modal.defaults }
            : modal.type === 'edit'
              ? { type: 'edit', chore: modal.chore }
              : { type: 'create' }
        }
        onClose={() => setModal({ type: 'closed' })}
        onSave={saveChore}
        onDelete={deleteChore}
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
      />
    </div>
  )
}
