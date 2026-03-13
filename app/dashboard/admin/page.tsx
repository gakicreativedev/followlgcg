'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, UserRole, ROLE_LABELS, TeamSector, TEAM_LABELS } from '@/types/database'

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

  async function updateTeam(userId: string, newTeam: TeamSector) {
    setUpdatingId(userId)
    const supabase = createClient()
    await supabase.from('profiles').update({ team: newTeam, updated_at: new Date().toISOString() }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, team: newTeam } : u))
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

  async function removeUser(userId: string) {
    if (!confirm('ATENÇÃO: Isso vai REMOVER PERMANENTEMENTE este usuário. Deseja continuar?')) return
    setUpdatingId(userId)
    const supabase = createClient()
    // Remover profile completamente
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) {
      alert('Erro ao remover usuário: ' + error.message)
      setUpdatingId(null)
      return
    }
    setUsers(prev => prev.filter(u => u.id !== userId))
    setUpdatingId(null)
  }

  if (loading || !profile) return null

  const roles: UserRole[] = ['admin', 'pastor', 'lider', 'vice_lider', 'voluntario']
  const teams = Object.keys(TEAM_LABELS) as TeamSector[]

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
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>@{u.username ?? u.email.split('@')[0]}</p>
              {u.team && (
                <span className="badge badge-team" style={{ fontSize: 9 }}>
                  {TEAM_LABELS[u.team]}
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={u.team ?? ''}
                onChange={e => updateTeam(u.id, e.target.value as TeamSector)}
                disabled={updatingId === u.id || u.id === profile.id}
                style={{
                  fontSize: 11, padding: '4px 8px', borderRadius: 6,
                  background: 'var(--glass-2)', border: '1px solid var(--border)',
                  color: 'var(--gray-300)', cursor: u.id === profile.id ? 'not-allowed' : 'pointer',
                  maxWidth: 130
                }}
              >
                <option value="" disabled>Sem equipe</option>
                {teams.map(t => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
              </select>

              <select
                value={u.role}
                onChange={e => updateRole(u.id, e.target.value as UserRole)}
                disabled={updatingId === u.id || u.id === profile.id}
                style={{
                  fontSize: 11, padding: '4px 8px', borderRadius: 6,
                  background: 'var(--glass-2)', border: '1px solid var(--border)',
                  color: ROLE_COLORS[u.role], cursor: u.id === profile.id ? 'not-allowed' : 'pointer',
                }}
              >
                {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            {u.id !== profile.id && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => deactivateUser(u.id)}
                  disabled={updatingId === u.id}
                  style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(245,197,66,0.06)', border: '1px solid rgba(245,197,66,0.15)', color: 'var(--amber)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Desativar
                </button>
                <button
                  onClick={() => removeUser(u.id)}
                  disabled={updatingId === u.id}
                  style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(239,107,107,0.06)', border: '1px solid rgba(239,107,107,0.15)', color: 'var(--red)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Remover
                </button>
              </div>
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
