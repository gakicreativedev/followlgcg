'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { TeamSector, TEAM_LABELS, DAYS_LABELS } from '@/types/database'

type Tab = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regTeam, setRegTeam] = useState<TeamSector | ''>('')
  const [regDays, setRegDays] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (signInErr) {
      setError('E-mail ou senha inválidos.')
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

    if (!regTeam) {
      setError('Selecione a equipe de interesse.')
      setLoading(false)
      return
    }

    if (regDays.length === 0) {
      setError('Selecione pelo menos um dia de disponibilidade.')
      setLoading(false)
      return
    }

    if (regPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }

    const emailNorm = regEmail.trim().toLowerCase()
    const supabase = createClient()

    // Checar se email já existe
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailNorm)
      .single()

    if (existing) {
      setError('Este e-mail já está cadastrado.')
      setLoading(false)
      return
    }

    // Criar conta no Supabase Auth
    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email: emailNorm,
      password: regPassword,
      options: { data: { name: regName.trim() } }
    })

    if (signUpErr) {
      setError(`Erro ao criar conta: ${signUpErr.message}`)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Erro inesperado ao criar conta.')
      setLoading(false)
      return
    }

    // Login imediato para ter sessão antes do insert
    await supabase.auth.signInWithPassword({ email: emailNorm, password: regPassword })

    const { error: profileErr } = await supabase.from('profiles').insert({
      id: crypto.randomUUID(),
      name: regName.trim(),
      email: emailNorm,
      username: emailNorm.split('@')[0],
      auth_user_id: authData.user.id,
      role: 'voluntario',
      status: 'pendente',
      team: regTeam,
      available_days: regDays,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileErr) {
      setError(`Erro ao salvar perfil: ${profileErr.message}`)
      setLoading(false)
      return
    }

    // Logout — precisa de aprovação do admin
    await supabase.auth.signOut()

    setSuccess('Solicitação enviada! Aguarde a aprovação do administrador.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)' }} />
      </div>

      <div className="fade-in" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/Logo.png" alt="Logo" style={{
            height: 72, width: 'auto', objectFit: 'contain',
            margin: '0 auto 24px', display: 'block',
            filter: 'brightness(0.95)',
          }} />
          <div style={{ height: 1, margin: '0 auto', width: 48, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--glass-1)',
          borderRadius: 'var(--radius-md)',
          padding: 4,
          marginBottom: 20,
          border: '1px solid var(--border)',
          backdropFilter: 'blur(20px)',
        }}>
          {([['login', 'Entrar'], ['register', 'Solicitar Acesso']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(''); setSuccess('') }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: tab === key ? 600 : 400,
                color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
                background: tab === key ? 'var(--glass-3)' : 'transparent',
                border: tab === key ? '1px solid var(--border-strong)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.3s var(--ease-spring)',
                letterSpacing: '-0.01em',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 32px' }}>
          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>E-mail</label>
                <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label>Senha</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 16, textAlign: 'center' }}>{error}</p>}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15 }} disabled={loading}>
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
                <label>E-mail</label>
                <input type="email" placeholder="seu@email.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} required autoComplete="email" />
              </div>
              
              <div className="form-group">
                <label>Equipe de Interesse</label>
                <select value={regTeam} onChange={e => setRegTeam(e.target.value as TeamSector)} required>
                  <option value="" disabled>Selecione uma equipe...</option>
                  {Object.entries(TEAM_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ marginBottom: 12 }}>Dias Disponíveis</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {Object.entries(DAYS_LABELS).map(([v, l]) => (
                    <label key={v} style={{
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer',
                      margin: 0, textTransform: 'none', color: regDays.includes(v) ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: regDays.includes(v) ? 500 : 400,
                      transition: 'color 0.2s',
                    }}>
                      <input 
                        type="checkbox" 
                        checked={regDays.includes(v)}
                        onChange={(e) => setRegDays(prev => e.target.checked ? [...prev, v] : prev.filter(d => d !== v))}
                        style={{ width: 16, height: 16, accentColor: '#fff' }}
                      />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Senha</label>
                <input type="password" placeholder="••••••••" value={regPassword} onChange={e => setRegPassword(e.target.value)} required autoComplete="new-password" />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label>Confirmar senha</label>
                <input type="password" placeholder="••••••••" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} required autoComplete="new-password" />
              </div>
              {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 16, textAlign: 'center' }}>{error}</p>}
              {success && <p style={{ fontSize: 13, color: 'var(--green)', marginBottom: 16, textAlign: 'center' }}>{success}</p>}
              {!success && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15 }} disabled={loading}>
                  {loading ? 'Enviando...' : 'Solicitar Acesso'}
                </button>
              )}
              {success && (
                <button type="button" className="btn" style={{ width: '100%', justifyContent: 'center', padding: '13px 20px' }} onClick={() => { setTab('login'); setSuccess('') }}>
                  Voltar ao Login
                </button>
              )}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
                Seu acesso será ativado após aprovação do administrador.
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}
