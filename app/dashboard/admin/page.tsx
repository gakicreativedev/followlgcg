'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, UserRole, ROLE_LABELS } from '@/types/database'

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#e879a0',
  pastor: '#C4A050',
  lider: '#7c6af7',
  vice_lider: '#4a9eff',
  voluntario: '#3ecf8e',
}

export default function AdminPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const prof = await getCurrentProfile()
      if (!prof || prof.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setProfile(prof)

      const supabase = createClient()
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
      if (allUsers) setUsers(allUsers)

      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')
      setPendingCount(count ?? 0)

      setLoading(false)
    }
    load()
  }, [router])

  async function updateRole(userId: string, newRole: UserRole) {
    setUpdatingId(userId)
    const supabase = createClient()
    await supabase.from('profiles').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    setUpdatingId(null)
  }

  async function deactivateUser(userId: string) {
    if (!confirm('Desativar este usuário?')) return
    setUpdatingId(userId)
    const supabase = createClient()
    await supabase.from('profiles').update({ status: 'inativo', updated_at: new Date().toISOString() }).eq('id', userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
    setUpdatingId(null)
  }

  if (loading || !profile) return null

  const roles: UserRole[] = ['admin', 'pastor', 'lider', 'vice_lider', 'voluntario']

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Administração</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Gerencie usuários e permissões</p>
        </div>
        {pendingCount > 0 && (
          <button
            className="btn btn-primary"
            onClick={() => router.push('/dashboard/admin/cadastros')}
            style={{ position: 'relative' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Cadastros pendentes
            <span style={{ background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 6px', marginLeft: 4 }}>
              {pendingCount}
            </span>
          </button>
        )}
        {pendingCount === 0 && (
          <button className="btn" onClick={() => router.push('/dashboard/admin/cadastros')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Cadastros
          </button>
        )}
      </div>

      {/* Resumo por role */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 28 }}>
        {roles.map(role => (
          <div key={role} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: ROLE_COLORS[role] }}>
              {users.filter(u => u.role === role).length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{ROLE_LABELS[role]}</div>
          </div>
        ))}
      </div>

      {/* Lista de usuários */}
      <p className="section-title" style={{ marginBottom: 12 }}>Usuários ativos ({users.length})</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {users.map((u, i) => (
          <div
            key={u.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px',
              borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
              opacity: updatingId === u.id ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <div className="avatar" style={{ width: 36, height: 36, fontSize: 13, background: 'var(--bg-elevated)', color: ROLE_COLORS[u.role], flexShrink: 0 }}>
              {initials(u.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username ?? u.email.split('@')[0]}</p>
            </div>
            <select
              value={u.role}
              onChange={e => updateRole(u.id, e.target.value as UserRole)}
              disabled={updatingId === u.id || u.id === profile.id}
              style={{
                fontSize: 12, padding: '5px 8px', borderRadius: 7,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: ROLE_COLORS[u.role],
                cursor: u.id === profile.id ? 'not-allowed' : 'pointer',
              }}
            >
              {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            {u.id !== profile.id && (
              <button
                onClick={() => deactivateUser(u.id)}
                disabled={updatingId === u.id}
                style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}
              >
                Desativar
              </button>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum usuário ativo</p>
          </div>
        )}
      </div>
    </div>
  )
}
