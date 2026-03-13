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

export default function Sidebar({ profile, navItems }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="sidebar-glass" style={{
      width: 240,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 16px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 12px', marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Lagoinha</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>Equipe de Mídia</p>
          </div>
        </div>
        <div style={{ height: 1, margin: '20px 0 0', background: 'linear-gradient(90deg, transparent, var(--border-strong), transparent)' }} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(item => (
          <button
            key={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            onClick={() => router.push(item.href)}
          >
            <span style={{ display: 'flex', flexShrink: 0, opacity: 0.7 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Profile */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', marginBottom: 8 }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-strong)', flexShrink: 0 }} />
          ) : (
            <div className="avatar" style={{ background: 'var(--glass-3)', color: 'var(--text-primary)' }}>
              {initials(profile.name)}
            </div>
          )}
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{profile.name}</p>
            <span className={`badge badge-${profile.role}`} style={{ fontSize: 10, padding: '2px 8px' }}>{ROLE_LABELS[profile.role]}</span>
          </div>
        </div>
        <button className="nav-link" onClick={handleLogout} style={{ color: 'var(--red)', opacity: 0.8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sair
        </button>
      </div>
    </div>
  )
}
