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
    { email: 'pastor@igreja.com', label: 'Pastor André', role: 'Pastor' },
    { email: 'lider@igreja.com', label: 'Lucas Líder', role: 'Líder' },
    { email: 'vice@igreja.com', label: 'Marina Vice', role: 'Vice-líder' },
    { email: 'ana@igreja.com', label: 'Ana Lima', role: 'Voluntária' },
  ]

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) {
      const { error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) { setError('Credenciais inválidas.'); setLoading(false); return }
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
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(196,160,80,0.06) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '10%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(196,160,80,0.04) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 56, height: 56,
            background: 'rgba(196,160,80,0.08)',
            border: '1px solid rgba(196,160,80,0.35)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="#C4A050" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32, fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '0.03em',
            lineHeight: 1.1,
            marginBottom: 8,
          }}>Igreja Batista<br/>da Lagoinha</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Gestão da Equipe de Mídia
          </p>
          <div style={{
            height: 1, margin: '20px auto 0', width: 60,
            background: 'linear-gradient(90deg, transparent, rgba(196,160,80,0.5), transparent)',
          }} />
        </div>

        {/* Login card */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>E-mail</label>
              <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 22 }}>
              <label>Senha</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, textAlign: 'center' }}>{error}</p>
            )}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="card">
          <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'var(--font-main)' }}>
            Acessos de demonstração
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                onClick={() => fillDemo(acc.email)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px', borderRadius: 9,
                  background: email === acc.email ? 'rgba(196,160,80,0.08)' : 'transparent',
                  border: `1px solid ${email === acc.email ? 'rgba(196,160,80,0.3)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: email === acc.email ? 'rgba(196,160,80,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${email === acc.email ? 'rgba(196,160,80,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600,
                  color: email === acc.email ? 'var(--gold)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-main)',
                }}>
                  {acc.label.charAt(0)}
                </div>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{acc.label}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{acc.role}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="divider" style={{ margin: '14px 0 10px' }} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            Senha: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>demo123</span>
          </p>
        </div>

      </div>
    </div>
  )
}
