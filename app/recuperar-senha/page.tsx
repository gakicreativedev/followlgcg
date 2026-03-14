'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })

    if (resetErr) {
      setError('Erro ao enviar e-mail de recuperação. Tente novamente.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>Recuperar senha</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Informe seu e-mail para receber o link de redefinição.
          </p>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 8 }}>E-mail enviado!</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <a href="/login" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'underline' }}>Voltar ao login</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>E-mail</label>
                <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
              </div>
              {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 16, textAlign: 'center' }}>{error}</p>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15 }} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <a href="/login" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'underline' }}>Voltar ao login</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
