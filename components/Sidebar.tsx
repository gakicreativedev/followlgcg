'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile, ROLE_LABELS } from '@/types/database'

interface SidebarProps {
  profile: Profile
  navItems: { label: string; href: string; icon: React.ReactNode }[]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS: Record<string, { bg: string; color: string }> = {
  pastor: { bg: '#3c1f8a', color: '#c4b5fd' },
  lider: { bg: '#0e4d3a', color: '#6ee7b7' },
  vice_lider: { bg: '#44310a', color: '#fbbf24' },
  voluntario: { bg: '#1e2230', color: '#8b90a4' },
}

export default function Sidebar({ profile, navItems }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const colors = AVATAR_COLORS[profile.role] || AVATAR_COLORS.voluntario

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="sidebar-glass" style={{
      width: 224,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 14px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '4px 10px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div className="logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="#C4A050" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>Lagoinha</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Equipe de Mídia</p>
          </div>
        </div>
        <div className="divider-gold" style={{ margin: '16px 0 0' }} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(item => (
          <button
            key={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            onClick={() => router.push(item.href)}
          >
            <span style={{ display: 'flex', flexShrink: 0 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Profile */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 6 }}>
          <div className="avatar" style={{ background: colors.bg, color: colors.color }}>
            {initials(profile.name)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</p>
            <span className={`badge badge-${profile.role}`} style={{ fontSize: 10 }}>{ROLE_LABELS[profile.role]}</span>
          </div>
        </div>
        <button className="nav-link" onClick={handleLogout} style={{ color: 'var(--red)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sair
        </button>
      </div>
    </div>
  )
}
