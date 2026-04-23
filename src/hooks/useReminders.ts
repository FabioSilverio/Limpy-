import { parseISO, isValid } from 'date-fns'
import { useEffect } from 'react'
import type { AppSettings, Chore } from '../types'
import { buildReminderMessage, openWhatsAppPrefilled } from '../lib/whatsapp'
import { defaultRemindTimeIso } from '../lib/remind'
import { nextOccurrenceIso } from '../lib/recurrence'

const REMINDED_KEY = 'limpy:reminded-ids'

function wasAlreadyReminded(id: string): boolean {
  try {
    const raw = localStorage.getItem(REMINDED_KEY)
    if (!raw) return false
    const arr = JSON.parse(raw) as string[]
    return arr.includes(id)
  } catch {
    return false
  }
}

function markReminded(id: string) {
  try {
    const raw = localStorage.getItem(REMINDED_KEY)
    const arr: string[] = raw ? (JSON.parse(raw) as string[]) : []
    if (!arr.includes(id)) {
      arr.push(id)
      if (arr.length > 200) arr.splice(0, arr.length - 200)
      localStorage.setItem(REMINDED_KEY, JSON.stringify(arr))
    }
  } catch {
    /* ignore */
  }
}

/**
 * Para cada tarefa com `remindWhatsApp`, calcula o instante do próximo
 * lembrete (considerando recorrência) e dispara ao passar daquele horário.
 * Usa polling de 60s pra cobrir PWA em segundo plano e mudanças de data.
 */
export function useReminders(
  chores: Chore[],
  settings: AppSettings,
  onNotify?: (chore: Chore) => void,
) {
  useEffect(() => {
    const nextReminderIso = (ch: Chore): string | null => {
      if (ch.recurrence === 'none') {
        return ch.remindAt ?? defaultRemindTimeIso(ch) ?? null
      }
      const nextStart = nextOccurrenceIso(ch)
      if (!nextStart) return null
      const baseStart = parseISO(ch.startAt).getTime()
      const baseRemind = ch.remindAt ? parseISO(ch.remindAt).getTime() : baseStart - 15 * 60 * 1000
      const offsetMs = baseRemind - baseStart
      return new Date(parseISO(nextStart).getTime() + offsetMs).toISOString()
    }

    const fire = (ch: Chore, whenIso: string) => {
      const key = `${ch.id}:${whenIso}`
      if (wasAlreadyReminded(key)) return
      markReminded(key)

      onNotify?.(ch)
      const when = new Date(whenIso).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
      const body = buildReminderMessage(ch.title, ch.notes, when, settings.labelPartner)
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification('Limpy', {
          body: body.split('\n').slice(0, 4).join(' · '),
          tag: ch.id,
        })
        n.onclick = () => {
          openWhatsAppPrefilled(settings.whatsappPhone, body)
          n.close()
        }
      } else {
        openWhatsAppPrefilled(settings.whatsappPhone, body)
      }
    }

    const check = () => {
      const now = Date.now()
      for (const ch of chores) {
        if (!ch.remindWhatsApp) continue
        const iso = nextReminderIso(ch)
        if (!iso) continue
        const t = parseISO(iso)
        if (!isValid(t)) continue
        const delta = t.getTime() - now
        if (delta <= 0 && delta > -5 * 60 * 1000) {
          fire(ch, iso)
        }
      }
    }

    check()
    const id = window.setInterval(check, 60 * 1000)
    return () => window.clearInterval(id)
  }, [chores, onNotify, settings.labelPartner, settings.whatsappPhone])
}
