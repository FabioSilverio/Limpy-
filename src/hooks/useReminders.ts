import { parseISO, isValid } from 'date-fns'
import { useEffect, useRef } from 'react'
import type { AppSettings, Chore } from '../types'
import { buildReminderMessage, openWhatsAppPrefilled } from '../lib/whatsapp'
import { defaultRemindTimeIso } from '../lib/remind'

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
      localStorage.setItem(REMINDED_KEY, JSON.stringify(arr))
    }
  } catch {
    /* ignore */
  }
}

/**
 * Notificações do navegador + timers para abrir lembrete;
 * se `remindWhatsApp`, a notificação inclui ação de abrir o WhatsApp.
 */
export function useReminders(
  chores: Chore[],
  settings: AppSettings,
  onNotify?: (chore: Chore) => void,
) {
  const timers = useRef<Map<string, number>>(new Map())
  const settingsRef = useRef(settings)
  const onNotifyRef = useRef(onNotify)
  settingsRef.current = settings
  onNotifyRef.current = onNotify

  useEffect(() => {
    const map = timers.current
    for (const id of map.keys()) {
      clearTimeout(map.get(id))
    }
    map.clear()

    const now = Date.now()

    for (const ch of chores) {
      if (!ch.remindWhatsApp) continue

      let atIso = ch.remindAt
      if (!atIso) {
        atIso = defaultRemindTimeIso(ch) ?? null
      }
      if (!atIso) continue

      const t = parseISO(atIso)
      if (!isValid(t)) continue

      const key = `${ch.id}:${atIso}`
      if (wasAlreadyReminded(key)) continue

      const delay = t.getTime() - now
      if (delay < 0) continue

      const id = window.setTimeout(() => {
        markReminded(key)
        onNotifyRef.current?.(ch)
        if ('Notification' in window && Notification.permission === 'granted') {
          const when = t.toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })
          const body = buildReminderMessage(
            ch.title,
            ch.notes,
            when,
            settingsRef.current.labelPartner,
          )
          const n = new Notification('Limpy', {
            body: body.split('\n').slice(0, 4).join(' · '),
            tag: ch.id,
          })
          n.onclick = () => {
            openWhatsAppPrefilled(
              settingsRef.current.whatsappPhone,
              buildReminderMessage(
                ch.title,
                ch.notes,
                when,
                settingsRef.current.labelPartner,
              ),
            )
            n.close()
          }
        } else {
          const when = t.toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })
          openWhatsAppPrefilled(
            settingsRef.current.whatsappPhone,
            buildReminderMessage(
              ch.title,
              ch.notes,
              when,
              settingsRef.current.labelPartner,
            ),
          )
        }
      }, delay)

      map.set(ch.id, id)
    }

    return () => {
      for (const id of map.values()) clearTimeout(id)
      map.clear()
    }
  }, [chores, settings.whatsappPhone, settings.labelPartner])
}
