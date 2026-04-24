import { parseISO } from 'date-fns'
import type { Chore } from '../types'

type Badge = {
  id: string
  title: string
  minPoints: number
}

export type PlayerScore = {
  name: string
  points: number
  doneCount: number
  level: number
  nextLevelPoints: number
  badges: Badge[]
}

const BADGES: Badge[] = [
  { id: 'starter', title: 'Primeiro passo', minPoints: 20 },
  { id: 'focus', title: 'Foco total', minPoints: 80 },
  { id: 'pro', title: 'Produtividade PRO', minPoints: 160 },
  { id: 'master', title: 'Mestre da casa', minPoints: 300 },
]

export function chorePoints(chore: Chore): number {
  const start = parseISO(chore.startAt)
  const end = parseISO(chore.endAt)
  const minutes = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000))
  const durationBonus = Math.min(15, Math.floor(minutes / 30) * 2)
  const recurrenceBonus = chore.recurrence !== 'none' ? 3 : 0
  return 10 + durationBonus + recurrenceBonus
}

function levelFromPoints(points: number) {
  const level = Math.floor(points / 60) + 1
  const nextLevelPoints = level * 60
  return { level, nextLevelPoints }
}

export function buildScoreboard(chores: Chore[], fallbackName: string): PlayerScore[] {
  const done = chores.filter((c) => c.columnId === 'done')
  const map = new Map<string, { points: number; doneCount: number }>()

  for (const chore of done) {
    const name = chore.updatedBy?.trim() || fallbackName
    const prev = map.get(name) ?? { points: 0, doneCount: 0 }
    map.set(name, { points: prev.points + chorePoints(chore), doneCount: prev.doneCount + 1 })
  }

  if (map.size === 0) {
    map.set(fallbackName, { points: 0, doneCount: 0 })
  }

  return [...map.entries()]
    .map(([name, score]) => {
      const lvl = levelFromPoints(score.points)
      const badges = BADGES.filter((b) => score.points >= b.minPoints)
      return {
        name,
        points: score.points,
        doneCount: score.doneCount,
        level: lvl.level,
        nextLevelPoints: lvl.nextLevelPoints,
        badges,
      } satisfies PlayerScore
    })
    .sort((a, b) => b.points - a.points || b.doneCount - a.doneCount || a.name.localeCompare(b.name))
}
