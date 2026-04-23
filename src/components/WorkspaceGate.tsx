import type { FormEvent } from 'react'
import { useState } from 'react'
import { KeyRound, Plus, Users, ArrowRight, Home } from 'lucide-react'
import { createWorkspace, joinWorkspace, type Workspace } from '../lib/workspaceClient'
import { isSupabaseConfigured } from '../lib/supabase'

type Mode = 'join' | 'create'

type Props = {
  onEnter: (w: Workspace, nickname: string) => void
  onContinueOffline: () => void
}

function formatUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const maybe = err as {
      message?: string
      details?: string | null
      hint?: string | null
      code?: string
    }
    return [maybe.message, maybe.details, maybe.hint, maybe.code].filter(Boolean).join(' | ')
  }
  return 'Erro inesperado ao acessar o workspace.'
}

export function WorkspaceGate({ onEnter, onContinueOffline }: Props) {
  const [mode, setMode] = useState<Mode>('join')
  const [code, setCode] = useState('')
  const [passcode, setPasscode] = useState('')
  const [name, setName] = useState('Casa')
  const [nickname, setNickname] = useState(() => localStorage.getItem('limpy:nickname') ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      setError('Sincronização não configurada neste deploy. Use o modo offline.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      localStorage.setItem('limpy:nickname', nickname.trim() || 'Alguém')
      if (mode === 'create') {
        const w = await createWorkspace(code.trim(), passcode.trim(), name.trim() || 'Casa')
        onEnter(w, nickname.trim() || 'Alguém')
      } else {
        const w = await joinWorkspace(code.trim(), passcode.trim())
        if (!w) {
          setError('Código ou senha incorretos.')
          return
        }
        onEnter(w, nickname.trim() || 'Alguém')
      }
    } catch (err: unknown) {
      const msg = formatUnknownError(err)
      if (msg.includes('CODE_TAKEN')) setError('Esse código já existe. Use outro ou entre com a senha.')
      else if (msg.includes('CODE_TOO_SHORT')) setError('O código precisa ter 3+ caracteres.')
      else if (msg.includes('PASSCODE_TOO_SHORT')) setError('A senha precisa ter 4+ caracteres.')
      else if (msg.includes('permission denied for schema private'))
        setError('O banco ainda precisa da permissão final. Rode o SQL atualizado novamente no Supabase.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-8 pt-10">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300">
          <Home className="h-8 w-8" strokeWidth={1.6} />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-white">Limpy</h1>
        <p className="text-sm text-slate-400">
          Casa, calendário e quadro — compartilhe com quem mora com você.
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <div className="rounded-2xl border border-amber-600/40 bg-amber-950/30 p-4 text-amber-200 text-sm">
          A sincronização online ainda não está ativa neste deploy.
          <div className="mt-3">
            <button
              type="button"
              onClick={onContinueOffline}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white"
            >
              Continuar offline <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-slate-700 bg-slate-900/60 p-1">
            <button
              type="button"
              onClick={() => setMode('join')}
              className={[
                'flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm',
                mode === 'join' ? 'bg-teal-600 text-white' : 'text-slate-300',
              ].join(' ')}
            >
              <Users className="h-4 w-4" />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={[
                'flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm',
                mode === 'create' ? 'bg-teal-600 text-white' : 'text-slate-300',
              ].join(' ')}
            >
              <Plus className="h-4 w-4" />
              Criar
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="text-xs text-slate-500">Seu apelido</span>
              <input
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Como aparece nos avisos"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
              />
            </label>
            {mode === 'create' && (
              <label className="block">
                <span className="text-xs text-slate-500">Nome da casa</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Casa da Silva"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs text-slate-500">Código do workspace</span>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ex.: silveriocasa"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100 font-mono"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                Senha
              </span>
              <input
                required
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-slate-100"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Aguarde…' : mode === 'create' ? 'Criar workspace' : 'Entrar'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <button
            type="button"
            onClick={onContinueOffline}
            className="mt-3 w-full rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800/40"
          >
            Continuar offline (só neste dispositivo)
          </button>

          <p className="mt-6 text-[11px] leading-relaxed text-slate-500">
            Compartilhe o <b>código</b> e a <b>senha</b> com sua esposa para ela
            entrar em qualquer aparelho. As tarefas aparecem em tempo real.
          </p>
        </>
      )}
    </div>
  )
}
