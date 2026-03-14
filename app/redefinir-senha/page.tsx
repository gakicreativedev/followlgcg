'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase will auto-detect the recovery token from the URL hash
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Also check if already in a session (token already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })

    if (updateErr) {
      setError(`Erro: ${updateErr.message}`)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)' }} />
      </div>

      <div className="fade-in" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/Logo.png" alt="Logo" style={{ height: 72, width: 'auto', objectFit: 'contain', margin: '0 auto 24px', display: 'block', filter: 'brightness(0.95)' }} />
          <div style={{ height: 1, margin: '0 auto', width: 48, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
        </div>

        <div className="card" style={{ padding: '32px 32px' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 8 }}>Senha redefinida!</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Redirecionando para o painel...</p>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Verificando link de recuperação...</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                Se nada acontecer, o link pode ter expirado.{' '}
                <a href="/recuperar-senha" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>Solicitar novo link</a>
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>Nova senha</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                Defina sua nova senha abaixo.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nova senha</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoFocus autoComplete="new-password" />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label>Confirmar senha</label>
                  <input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
                </div>
                {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 16, textAlign: 'center' }}>{error}</p>}
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15 }} disabled={loading}>
                  {loading ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
