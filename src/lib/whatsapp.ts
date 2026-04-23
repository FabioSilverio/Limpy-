/**
 * Número só com dígitos, com DDI (ex: 5511999998888)
 */
export function normalizePhoneDigits(input: string): string {
  return input.replace(/\D/g, '')
}

/**
 * Abre o WhatsApp com texto pronto (lembrete de afazer).
 * https://wa.me/?text=... ou wa.me/PHONE?text=...
 */
export function openWhatsAppPrefilled(phoneDigits: string, text: string): void {
  const p = normalizePhoneDigits(phoneDigits)
  const t = encodeURIComponent(text)
  if (p.length >= 10) {
    window.open(`https://wa.me/${p}?text=${t}`, '_blank', 'noopener,noreferrer')
  } else {
    window.open(`https://wa.me/?text=${t}`, '_blank', 'noopener,noreferrer')
  }
}

export function buildReminderMessage(
  title: string,
  notes: string,
  whenLabel: string,
  partnerLabel: string,
): string {
  const lines = [
    `🗓 Limpy — lembrete`,
    `📌 *${title}*`,
    `⏰ ${whenLabel}`,
    partnerLabel ? `👤 Atualizado por: ${partnerLabel}` : '',
    notes?.trim() ? `📝 ${notes.trim()}` : '',
  ].filter(Boolean)
  return lines.join('\n')
}
