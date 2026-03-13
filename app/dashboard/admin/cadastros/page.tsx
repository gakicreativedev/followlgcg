'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, UserRole, ROLE_LABELS } from '@/types/database'

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function CadastrosPage() {
  const router = useRouter()
  const [pending, setPending] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [roleMap, setRoleMap] = useState<Record<string, UserRole>>({})

  useEffect(() => {
    async function load() {
      const prof = await getCurrentProfile()
      if (!prof || prof.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pendente')
        .order('created_at', { ascending: true })

      if (data) {
        setPending(data)
        const map: Record<string, UserRole> = {}
        data.forEach((p: Profile) => { map[p.id] = 'voluntario' })
        setRoleMap(map)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function approve(user: Profile) {
    setUpdatingId(user.id)
    const supabase = createClient()
    await supabase.from('profiles').update({
      status: 'ativo',
      role: roleMap[user.id] ?? 'voluntario',
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setPending(prev => prev.filter(p => p.id !== user.id))
    setUpdatingId(null)
  }

  async function reject(user: Profile) {
    if (!confirm(`Rejeitar e remover o cadastro de "${user.name}"?`)) return
    setUpdatingId(user.id)
    const supabase = createClient()
    // Deletar profile e usuário do auth
    await supabase.from('profiles').delete().eq('id', user.id)
    if (user.auth_user_id) {
      await supabase.auth.admin.deleteUser(user.auth_user_id)
    }
    setPending(prev => prev.filter(p => p.id !== user.id))
    setUpdatingId(null)
  }

  if (loading) return null

  const roles: UserRole[] = ['pastor', 'lider', 'vice_lider', 'voluntario']

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={() => router.push('/dashboard/admin')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Cadastros pendentes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Aprove ou rejeite as solicitações de acesso</p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px', opacity: 0.3 }}>
            <path d="M9 11l3 3L22 4" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nenhum cadastro pendente</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Todos os acessos foram processados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pending.map(user => (
            <div key={user.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: updatingId === user.id ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <div className="avatar" style={{ width: 44, height: 44, fontSize: 16, background: 'rgba(196,160,80,0.1)', color: 'var(--gold)', flexShrink: 0 }}>
                {initials(user.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user.username ?? user.email.split('@')[0]}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Solicitado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={roleMap[user.id] ?? 'voluntario'}
                  onChange={e => setRoleMap(prev => ({ ...prev, [user.id]: e.target.value as UserRole }))}
                  disabled={updatingId === user.id}
                  style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button
                  onClick={() => approve(user)}
                  disabled={updatingId === user.id}
                  style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(62,207,142,0.12)', border: '1px solid rgba(62,207,142,0.3)', color: 'var(--green)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Aprovar
                </button>
                <button
                  onClick={() => reject(user)}
                  disabled={updatingId === user.id}
                  style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
