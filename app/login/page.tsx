'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const DEMO_ACCOUNTS = [
    { email: 'pastor@igreja.com', label: 'Pastor André', badge: 'badge-pastor', role: 'pastor' },
    { email: 'lider@igreja.com', label: 'Lucas Líder', badge: 'badge-lider', role: 'lider' },
    { email: 'vice@igreja.com', label: 'Marina Vice', badge: 'badge-vice_lider', role: 'vice_lider' },
    { email: 'ana@igreja.com', label: 'Ana Lima', badge: 'badge-voluntario', role: 'voluntario' },
  ]

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // For demo: try sign in, if fails try sign up
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

    if (signInErr) {
      const { error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) {
        setError('Credenciais inválidas. Tente novamente.')
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword('demo123')
    setError('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(124,106,247,0.08) 0%, transparent 60%), var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-border)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#7c6af7" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="#7c6af7" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#7c6af7" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Mídia Igreja</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Gestão da equipe de comunicação</p>
        </div>

        {/* Login form */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, textAlign: 'center' }}>{error}</p>
            )}

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="card">
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            Contas demo — clique para preencher
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                onClick={() => fillDemo(acc.email)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: email === acc.email ? 'var(--bg-elevated)' : 'transparent',
                  border: `1px solid ${email === acc.email ? 'var(--border-strong)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                <div className={`badge ${acc.badge}`}>{acc.role === 'pastor' ? 'Pastor' : acc.role === 'lider' ? 'Líder' : acc.role === 'vice_lider' ? 'Vice' : 'Vol.'}</div>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{acc.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc.email}</p>
                </div>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>Senha para todos: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>demo123</code></p>
        </div>

      </div>
    </div>
  )
}
