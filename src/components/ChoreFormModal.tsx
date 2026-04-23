import { useMemo, useState } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { X, Trash2 } from 'lucide-react'
import { CHORE_ICONS } from '../lib/choreIcons'
import { defaultRemindTimeIso, addMinutesToIso } from '../lib/remind'
import type { Chore, ColumnId } from '../types'
import { defaultChoreDurationMin } from '../types'
import { clsx } from 'clsx'

function toInputLocal(iso: string) {
  const d = parseISO(iso)
  if (!isValid(d)) return ''
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

type Mode = { type: 'create'; defaults?: Partial<Chore> } | { type: 'edit'; chore: Chore }

type Props = {
  open: boolean
  mode: Mode
  onClose: () => void
  onSave: (c: Chore) => void
  onDelete?: (id: string) => void
}

function buildNewChore(overrides: Partial<Chore>): Chore {
  const start = new Date()
  const end = new Date(start.getTime() + defaultChoreDurationMin * 60 * 1000)
  return {
    id: crypto.randomUUID(),
    title: 'Nova tarefa',
    notes: '',
    iconKey: 'home',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    columnId: 'backlog',
    remindWhatsApp: false,
    remindAt: null,
    ...overrides,
  }
}

export function ChoreFormModal({ open, mode, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Chore>(() =>
    mode.type === 'create' ? buildNewChore(mode.defaults ?? {}) : { ...mode.chore },
  )

  const canSave = useMemo(() => {
    if (!draft?.title.trim()) return false
    if (!isValid(parseISO(draft.startAt))) return false
    if (!isValid(parseISO(draft.endAt))) return false
    if (new Date(draft.endAt) <= new Date(draft.startAt)) return false
    if (draft.remindWhatsApp && draft.remindAt && !isValid(parseISO(draft.remindAt))) return false
    return true
  }, [draft])

  if (!open) return null

  const updateStart = (s: string) => {
    const startIso = new Date(s).toISOString()
    const d = new Date(s)
    const endD = new Date(d.getTime() + defaultChoreDurationMin * 60 * 1000)
    setDraft((x) => {
      if (!x) return x
      return { ...x, startAt: startIso, endAt: endD.toISOString() }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="chore-form-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Fechar"
      />
      <div className="relative z-10 flex max-h-[min(90dvh,700px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-600 bg-slate-900 shadow-xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 id="chore-form-title" className="text-lg font-semibold text-slate-50">
            {mode.type === 'create' ? 'Nova tarefa' : 'Editar tarefa'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroller">
          <label className="block">
            <span className="text-xs text-slate-500">Título</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
              value={draft.title}
              onChange={(e) => setDraft((d) => d && { ...d, title: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Anotações</span>
            <textarea
              className="mt-1 w-full min-h-[88px] rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
              value={draft.notes}
              onChange={(e) => setDraft((d) => d && { ...d, notes: e.target.value })}
              placeholder="Listas, detalhes, lista de compras…"
            />
          </label>

          <div>
            <p className="text-xs text-slate-500 mb-2">Ícone do afazer</p>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 max-h-40 overflow-y-auto scroller">
              {CHORE_ICONS.map(({ key, label, Icon }) => (
                <button
                  type="button"
                  key={key}
                  title={label}
                  onClick={() => setDraft((d) => d && { ...d, iconKey: key })}
                  className={clsx(
                    'flex h-10 items-center justify-center rounded-lg border text-teal-200',
                    draft.iconKey === key
                      ? 'border-teal-500 bg-teal-950/50'
                      : 'border-slate-700 bg-slate-800/50',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500">Início</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-2 text-slate-100 text-sm"
                value={toInputLocal(draft.startAt)}
                onChange={(e) => {
                  if (!e.target.value) return
                  updateStart(e.target.value)
                }}
              />
            </label>
            <label className="block col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500">Fim</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-2 text-slate-100 text-sm"
                value={toInputLocal(draft.endAt)}
                onChange={(e) => {
                  if (!e.target.value) return
                  setDraft(
                    (d) =>
                      d && {
                        ...d,
                        endAt: new Date(e.target.value).toISOString(),
                      },
                  )
                }}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-slate-500">Coluna (quadro)</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
              value={draft.columnId}
              onChange={(e) =>
                setDraft(
                  (d) =>
                    d && {
                      ...d,
                      columnId: e.target.value as ColumnId,
                    },
                )
              }
            >
              <option value="backlog">A fazer</option>
              <option value="doing">Em andamento</option>
              <option value="done">Feito</option>
            </select>
          </label>

          <div className="rounded-xl border border-slate-600/60 bg-slate-950/40 p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                className="rounded border-slate-500"
                checked={draft.remindWhatsApp}
                onChange={(e) => {
                  const on = e.target.checked
                  setDraft((d) => {
                    if (!d) return d
                    const remAt =
                      d.remindAt ??
                      (on ? (defaultRemindTimeIso(d) ?? d.startAt) : null)
                    return { ...d, remindWhatsApp: on, remindAt: on ? remAt : d.remindAt }
                  })
                }}
              />
              Lembrete com aviso (notificação + link WhatsApp)
            </label>
            <p className="text-[11px] text-slate-500">
              Configure o número em “Ajustes”. O lembrete usa notificações do navegador; em celular, deixe o
              PWA com permissão de notificação. Se puder, preencha o horário exato abaixo.
            </p>
            {draft.remindWhatsApp && (
              <label className="block">
                <span className="text-xs text-slate-500">Horário do lembrete</span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    className="flex-1 min-w-[12rem] rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-2 text-slate-100 text-sm"
                    value={draft.remindAt ? toInputLocal(draft.remindAt) : toInputLocal(defaultRemindTimeIso(draft) ?? draft.startAt)}
                    onChange={(e) => {
                      if (!e.target.value) return
                      setDraft((d) =>
                        d
                          ? { ...d, remindAt: new Date(e.target.value).toISOString() }
                          : d,
                      )
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs text-teal-400 underline"
                    onClick={() =>
                      setDraft(
                        (d) =>
                          d && {
                            ...d,
                            remindAt: addMinutesToIso(d.startAt, -15) ?? d.remindAt,
                          },
                      )
                    }
                  >
                    15 min antes do início
                  </button>
                </div>
              </label>
            )}
          </div>
        </div>
        <footer className="flex items-center justify-between gap-2 border-t border-slate-700 p-3">
          <div>
            {mode.type === 'edit' && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(draft.id)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-rose-400 hover:bg-rose-950/40"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => {
                let d = { ...draft }
                if (d.remindWhatsApp && !d.remindAt) {
                  d = { ...d, remindAt: defaultRemindTimeIso(d) ?? d.startAt }
                }
                onSave(d)
              }}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
