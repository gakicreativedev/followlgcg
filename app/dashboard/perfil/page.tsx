'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, ROLE_LABELS, TEAM_LABELS } from '@/types/database'

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')

  // Edição de nome
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    async function load() {
      const prof = await getCurrentProfile()
      if (prof) {
        setProfile(prof)
        setAvatarUrl(prof.avatar_url || '')
        setNameValue(prof.name)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)

    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`

    const { error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })

    if (uploadErr) {
      alert("Erro ao subir imagem. O bucket 'avatars' foi criado no Supabase Storage?")
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
    await supabase.from('profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', profile.id)
    setAvatarUrl(publicUrl)
    setProfile({ ...profile, avatar_url: publicUrl })
    setUploading(false)
  }

  async function removeAvatar() {
    if (!profile) return
    const supabase = createClient()
    await supabase.from('profiles').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', profile.id)
    setAvatarUrl('')
    setProfile({ ...profile, avatar_url: undefined })
  }

  async function saveName() {
    if (!profile || !nameValue.trim()) return
    setSavingName(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ name: nameValue.trim(), updated_at: new Date().toISOString() }).eq('id', profile.id)
    setProfile({ ...profile, name: nameValue.trim() })
    setEditingName(false)
    setSavingName(false)
  }

  if (loading || !profile) return null

  const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="fade-in" style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>Meu Perfil</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 6, letterSpacing: '-0.01em' }}>Gerencie suas informações pessoais</p>
      </div>

      <div className="card" style={{ padding: '36px 40px' }}>

        {/* Avatar Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
          <div style={{ position: 'relative' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  width: 88, height: 88, borderRadius: '50%', objectFit: 'cover',
                  border: '2px solid var(--border-strong)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                }}
              />
            ) : (
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--glass-3)', border: '2px solid var(--border-strong)',
                fontSize: 28, fontWeight: 700, color: 'var(--text-primary)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              }}>
                {initials}
              </div>
            )}
          </div>

          <div>
            {/* Nome editável */}
            {editingName ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <input
                  autoFocus
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  className="input-field"
                  style={{ fontSize: 16, fontWeight: 600, padding: '6px 12px', width: 200 }}
                />
                <button className="btn btn-primary" onClick={saveName} disabled={savingName} style={{ padding: '6px 12px', fontSize: 12 }}>
                  {savingName ? '...' : 'Salvar'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setEditingName(false); setNameValue(profile.name) }} style={{ padding: '6px 10px', fontSize: 12 }}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{profile.name}</h2>
                <button
                  onClick={() => setEditingName(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: 4, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="Editar nome"
                >
                  ✏️
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span className={`badge badge-${profile.role}`}>{ROLE_LABELS[profile.role]}</span>
              {profile.team && <span className="badge badge-team">{TEAM_LABELS[profile.team]}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="btn" style={{ cursor: 'pointer', fontSize: 13, padding: '8px 16px' }}>
                {uploading ? 'Enviando...' : 'Alterar foto'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={uploading} />
              </label>
              {avatarUrl && (
                <button className="btn btn-ghost" onClick={removeAvatar} style={{ fontSize: 13, padding: '8px 16px', color: 'var(--red)' }}>
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>E-mail</p>
            <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{profile.email}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Equipe</p>
            <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{profile.team ? TEAM_LABELS[profile.team] : 'Não definida'}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Dias disponíveis</p>
            <p style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{profile.available_days?.join(', ') || 'Não informado'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

