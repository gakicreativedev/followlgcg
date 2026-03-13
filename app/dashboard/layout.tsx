'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types/database'
import Sidebar from '@/components/Sidebar'

const NAV_PASTOR = [
  { label: 'Visão geral', href: '/dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { label: 'Tarefas', href: '/dashboard/tarefas', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { label: 'Nova demanda', href: '/dashboard/nova-tarefa', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Equipe', href: '/dashboard/equipe', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: 'Calendário', href: '/dashboard/calendario', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
]

const NAV_LIDER = [
  { label: 'Painel', href: '/dashboard', icon: NAV_PASTOR[0].icon },
  { label: 'Tarefas', href: '/dashboard/tarefas', icon: NAV_PASTOR[1].icon },
  { label: 'Nova demanda', href: '/dashboard/nova-tarefa', icon: NAV_PASTOR[2].icon },
  { label: 'Equipe', href: '/dashboard/equipe', icon: NAV_PASTOR[3].icon },
]

const NAV_VOLUNTARIO = [
  { label: 'Minhas tarefas', href: '/dashboard', icon: NAV_PASTOR[1].icon },
  { label: 'Meu perfil', href: '/dashboard/perfil', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase.from('profiles').select('*').eq('email', user.email).single()

      if (!data) {
        router.push('/login')
        return
      }

      setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Carregando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!profile) return null

  const navItems = profile.role === 'voluntario' ? NAV_VOLUNTARIO
    : profile.role === 'pastor' ? NAV_PASTOR
    : NAV_LIDER

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile} navItems={navItems} />
      <main style={{ flex: 1, padding: '28px 32px', overflow: 'auto', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
