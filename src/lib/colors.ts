// Paleta e cores de cards do Limpy.
// Tudo guardado como hex (ex.: '#14b8a6') para ser fácil de serializar e
// transportar pro Google Calendar. A estilização aplica transparência no
// CSS (opcional) pra combinar com o tema escuro.

export interface ColorOption {
  key: string
  label: string
  hex: string
}

export const COLOR_PALETTE: ColorOption[] = [
  { key: 'teal', label: 'Verde-água', hex: '#14b8a6' },
  { key: 'emerald', label: 'Verde folha', hex: '#10b981' },
  { key: 'lime', label: 'Limão', hex: '#84cc16' },
  { key: 'amber', label: 'Âmbar', hex: '#f59e0b' },
  { key: 'orange', label: 'Laranja', hex: '#f97316' },
  { key: 'rose', label: 'Rosa', hex: '#f43f5e' },
  { key: 'pink', label: 'Pink', hex: '#ec4899' },
  { key: 'fuchsia', label: 'Fúcsia', hex: '#d946ef' },
  { key: 'violet', label: 'Violeta', hex: '#8b5cf6' },
  { key: 'indigo', label: 'Índigo', hex: '#6366f1' },
  { key: 'sky', label: 'Céu', hex: '#0ea5e9' },
  { key: 'cyan', label: 'Ciano', hex: '#06b6d4' },
  { key: 'slate', label: 'Grafite', hex: '#64748b' },
]

const ICON_COLOR_MAP: Record<string, string> = {
  home: '#14b8a6',
  sparkles: '#06b6d4',
  utensils: '#f59e0b',
  refrigerator: '#0ea5e9',
  trash: '#64748b',
  shirt: '#6366f1',
  washing: '#0ea5e9',
  bath: '#06b6d4',
  droplets: '#0ea5e9',
  package: '#64748b',
  shopping: '#8b5cf6',
  leaf: '#10b981',
  flower: '#ec4899',
  tree: '#84cc16',
  dog: '#f59e0b',
  baby: '#f43f5e',
  lamp: '#fbbf24',
  paint: '#d946ef',
  fan: '#06b6d4',
  wind: '#06b6d4',
  coffee: '#b45309',
  pizza: '#f97316',
  martini: '#d946ef',
  book: '#6366f1',
  music: '#8b5cf6',
  sun: '#f59e0b',
  mail: '#0ea5e9',
}

/** Cor efetiva de um card: manual (`color`) ou derivada do ícone. */
export function resolveChoreColor(color: string | null | undefined, iconKey: string) {
  if (color && /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(color)) return color
  return ICON_COLOR_MAP[iconKey] ?? '#14b8a6'
}

/** Gera estilos inline para aplicar a cor nos cards (funciona com Tailwind). */
export function choreColorStyles(hex: string): {
  borderColor: string
  backgroundColor: string
  boxShadow: string
} {
  return {
    borderColor: hexWithAlpha(hex, 0.55),
    backgroundColor: hexWithAlpha(hex, 0.16),
    boxShadow: `0 0 0 1px ${hexWithAlpha(hex, 0.08)} inset`,
  }
}

export function hexWithAlpha(hex: string, alpha: number) {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
