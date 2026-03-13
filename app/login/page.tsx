'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { usernameToEmail } from '@/lib/auth'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')

  // Login state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Register state
  const [regName, setRegName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const email = usernameToEmail(username)
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) {
      setError('Usuário ou senha inválidos.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (regPassword !== regConfirm) {
      setError('As senhas não coincidem.')
      setLoading(false)
      return
    }

    if (regPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const email = usernameToEmail(regUsername)

    // Verificar se username já existe
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', regUsername.trim().toLowerCase())
      .single()

    if (existing) {
      setError('Este usuário já está em uso.')
      setLoading(false)
      return
    }

    // Criar conta no Auth
    const { data: authData, error: signUpErr } = await supabase.auth.signUp({ email, password: regPassword })
    if (signUpErr || !authData.user) {
      setError('Erro ao criar conta. Tente outro nome de usuário.')
      setLoading(false)
      return
    }

    // Criar profile com status pendente
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: crypto.randomUUID(),
      name: regName.trim(),
      email,
      username: regUsername.trim().toLowerCase(),
      auth_user_id: authData.user.id,
      role: 'voluntario',
      status: 'pendente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileErr) {
      setError('Erro ao salvar perfil.')
      setLoading(false)
      return
    }

    setSuccess('Solicitação enviada! Aguarde a aprovação do administrador.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {/* Fundo decorativo */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,160,80,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,160,80,0.04) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(196,160,80,0.08)', border: '1px solid rgba(196,160,80,0.35)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="#C4A050" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.03em', lineHeight: 1.1, marginBottom: 8 }}>
            Igreja Batista<br/>da Lagoinha
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Gestão da Equipe de Mídia
          </p>
          <div style={{ height: 1, margin: '20px auto 0', width: 60, background: 'linear-gradient(90deg, transparent, rgba(196,160,80,0.5), transparent)' }} />
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 12, padding: 4, marginBottom: 16, border: '1px solid var(--border)' }}>
          {([['login', 'Entrar'], ['register', 'Solicitar Acesso']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(''); setSuccess('') }}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: tab === key ? 600 : 400,
                color: tab === key ? 'var(--gold)' : 'var(--text-muted)',
                background: tab === key ? 'rgba(196,160,80,0.1)' : 'transparent',
                border: tab === key ? '1px solid rgba(196,160,80,0.25)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="card">
          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Usuário</label>
                <input type="text" placeholder="seu.usuario" value={username} onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="username" />
              </div>
              <div className="form-group" style={{ marginBottom: 22 }}>
                <label>Senha</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              {error && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, textAlign: 'center' }}>{error}</p>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Nome completo</label>
                <input type="text" placeholder="Seu Nome" value={regName} onChange={e => setRegName(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label>Usuário</label>
                <input type="text" placeholder="seu.usuario" value={regUsername} onChange={e => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} required autoComplete="username" />
              </div>
              <div className="form-group">
                <label>Senha</label>
                <input type="password" placeholder="••••••••" value={regPassword} onChange={e => setRegPassword(e.target.value)} required autoComplete="new-password" />
              </div>
              <div className="form-group" style={{ marginBottom: 22 }}>
                <label>Confirmar senha</label>
                <input type="password" placeholder="••••••••" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} required autoComplete="new-password" />
              </div>
              {error && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, textAlign: 'center' }}>{error}</p>}
              {success && <p style={{ fontSize: 12, color: 'var(--green)', marginBottom: 14, textAlign: 'center' }}>{success}</p>}
              {!success && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }} disabled={loading}>
                  {loading ? 'Enviando...' : 'Solicitar Acesso'}
                </button>
              )}
              {success && (
                <button type="button" className="btn" style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }} onClick={() => { setTab('login'); setSuccess('') }}>
                  Voltar ao Login
                </button>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 14 }}>
                Seu acesso será ativado após aprovação do administrador.
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}
