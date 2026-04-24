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
    <section className="mb-4 rounded-2xl border border-teal-700/30 bg-gradient-to-br from-teal-900/20 to-slate-900/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-teal-200">Liga Limpy</h2>
          <p className="text-xs text-slate-400">
            Quem concluir mais tarefas ganha mais pontos, sobe de nível e desbloqueia prêmios.
          </p>
        </div>
        <p className="text-xs text-amber-300">
          Liderando: <span className="font-semibold">{leader.name}</span> ({leader.points} XP)
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-2.5">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Seu nível</p>
          <p className="text-lg font-bold text-white">
            Lv {me.level} · {me.points} XP
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700/70">
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Próximo nível em {Math.max(0, me.nextLevelPoints - me.points)} XP
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {me.badges.length > 0 ? (
              me.badges.map((b) => (
                <span
                  key={b.id}
                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200"
                >
                  {b.title}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-500">Nenhum prêmio ainda</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-2.5">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Ranking</p>
          <div className="space-y-1.5">
            {board.slice(0, 5).map((p, index) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-lg bg-slate-800/50 px-2 py-1 text-xs"
              >
                <p className="text-slate-200">
                  #{index + 1} {p.name}
                </p>
                <p className="text-teal-300">
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
