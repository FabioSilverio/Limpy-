export type ColumnId = 'backlog' | 'doing' | 'done'

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly'

export interface Chore {
  id: string
  title: string
  notes: string
  iconKey: string
  /** Início do bloco no calendário (ISO) */
  startAt: string
  /** Fim; se omitido, UI assume 1h a partir de startAt */
  endAt: string
  columnId: ColumnId
  /** Aviso no aparelho + link WhatsApp */
  remindWhatsApp: boolean
  /** Quando dispara o lembrete (ISO). Vazio = 15 min antes de `startAt` */
  remindAt: string | null
  /** Repetir: nenhum, todo dia, dias úteis ou toda semana no mesmo dia da semana */
  recurrence: RecurrenceType
  /** Último dia (inclusivo) em que a recorrência ainda é gerada, ISO */
  recurrenceUntil: string | null
  /** Cor hex manual, ou null para usar a cor default do ícone */
  color: string | null
}

export interface AppSettings {
  /** Só dígitos com DDI, ex: 5511999998888 */
  whatsappPhone: string
  /** Nome da pessoa que cadastra tarefas (só rótulo) */
  labelPartner: string
  /** Horário mínimo mostrado no calendário (0–23) */
  dayStartHour: number
  /** Horário máximo mostrado (0–24) */
  dayEndHour: number
  /** 0 = domingo, 1 = segunda, … (date-fns) */
  weekStartsOn: 0 | 1
}

export const defaultSettings = (): AppSettings => ({
  whatsappPhone: '',
  labelPartner: 'Família',
  dayStartHour: 6,
  dayEndHour: 23,
  weekStartsOn: 1,
})

export const defaultChoreDurationMin: number = 60
