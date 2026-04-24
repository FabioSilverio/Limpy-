import type { Chore } from '../types'
import { buildScoreboard } from '../lib/gamification'

type Props = {
  chores: Chore[]
  currentUser: string
}

export function GamificationPanel({ chores, currentUser }: Props) {
  const board = buildScoreboard(chores, currentUser)
  const me = board.find((p) => p.name === currentUser) ?? board[0]
  const leader = board[0]
  const progressPct =
    me.nextLevelPoints > 0 ? Math.min(100, Math.round((me.points / me.nextLevelPoints) * 100)) : 0

  return (
    <section className="rounded-3xl border border-white/10 bg-white/8 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-lime-200">Liga Limpy</h2>
          <p className="text-xs text-slate-400">XP, níveis e prêmios por tarefas feitas.</p>
        </div>
        <p className="rounded-full bg-lime-300/15 px-2 py-1 text-[11px] text-lime-100">
          #{leader.name} · {leader.points} XP
        </p>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-2.5">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Seu nível</p>
          <p className="text-lg font-bold text-white">
            Lv {me.level} · {me.points} XP
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-lime-300" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Próximo nível em {Math.max(0, me.nextLevelPoints - me.points)} XP
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {me.badges.length > 0 ? (
              me.badges.map((b) => (
                <span
                  key={b.id}
                  className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] text-amber-100"
                >
                  {b.title}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-500">Nenhum prêmio ainda</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-2.5">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Ranking</p>
          <div className="space-y-1.5">
            {board.slice(0, 5).map((p, index) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-xl bg-white/8 px-2 py-1.5 text-xs"
              >
                <p className="text-slate-200">
                  #{index + 1} {p.name}
                </p>
                <p className="text-lime-200">
                  {p.points} XP · {p.doneCount} feitas
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
