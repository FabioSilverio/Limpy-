import { X, Bell, Smartphone } from 'lucide-react'
import type { AppSettings } from '../types'
import { normalizePhoneDigits } from '../lib/whatsapp'

type Props = {
  open: boolean
  onClose: () => void
  settings: AppSettings
  onChange: (p: Partial<AppSettings>) => void
  onRequestNotification: () => void
}

export function SettingsSheet({ open, onClose, settings, onChange, onRequestNotification }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Fechar" />
      <div
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-slate-600 bg-slate-900 shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="settings-title"
      >
        <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 id="settings-title" className="text-lg font-semibold text-slate-50">
            Ajustes
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-4 p-4 text-sm text-slate-200">
          <label className="block">
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <Smartphone className="h-3.5 w-3.5" />
              WhatsApp (DDI + DDD + número, só números)
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 font-mono text-slate-100"
              inputMode="numeric"
              placeholder="5511999998888"
              value={settings.whatsappPhone}
              onChange={(e) => onChange({ whatsappPhone: normalizePhoneDigits(e.target.value) })}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Usado no link de lembrete. O WhatsApp não oferece API grátis para pessoas físicas: o app abre a conversa
              com a mensagem pronta. Para lembretes 100% automáticos no aparelho dela, seria necessário outro
              serviço (pago) ou agendar manualmente.
            </p>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Como chamar quem cadastra (rótulo nos avisos)</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
              value={settings.labelPartner}
              onChange={(e) => onChange({ labelPartner: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-slate-500">Dia inicia às (h)</span>
              <input
                type="number"
                min={0}
                max={22}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-2"
                value={settings.dayStartHour}
                onChange={(e) => onChange({ dayStartHour: Math.min(22, Math.max(0, Number(e.target.value) || 0)) })}
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Dia mostra até (h)</span>
              <input
                type="number"
                min={1}
                max={24}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-2"
                value={settings.dayEndHour}
                onChange={(e) => onChange({ dayEndHour: Math.min(24, Math.max(1, Number(e.target.value) || 24)) })}
              />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-32">Início da semana</span>
            <select
              className="flex-1 rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-2"
              value={settings.weekStartsOn}
              onChange={(e) => onChange({ weekStartsOn: Number(e.target.value) as 0 | 1 })}
            >
              <option value={1}>Segunda</option>
              <option value={0}>Domingo</option>
            </select>
          </label>
          <div className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-950/50 p-3">
            <Bell className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-medium text-slate-100">Notificações</p>
              <p className="text-[12px] text-slate-500">
                Conceda permissão para o navegador avisar no horário do lembrete (inclusive com tela apagada em alguns
                Android com PWA instalado).
              </p>
              <button
                type="button"
                onClick={onRequestNotification}
                className="mt-2 rounded-lg border border-amber-600/50 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-200"
              >
                Pedir permissão
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
