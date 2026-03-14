'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, Announcement, AnnouncementComment, TeamSector, TEAM_LABELS } from '@/types/database'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function AtualizacoesPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // New announcement form
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [teamTarget, setTeamTarget] = useState<TeamSector | ''>('')
  const [pinned, setPinned] = useState(false)
  const [posting, setPosting] = useState(false)

  // Comments state per announcement
  const [commentsMap, setCommentsMap] = useState<Record<string, AnnouncementComment[]>>({})
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [newCommentMap, setNewCommentMap] = useState<Record<string, string>>({})

  const canPost = profile && ['admin', 'pastor', 'lider'].includes(profile.role)

  useEffect(() => {
    async function load() {
      const prof = await getCurrentProfile()
      if (!prof) return
      setProfile(prof)

      const supabase = createClient()
      const { data: profiles } = await supabase.from('profiles').select('*')
      if (profiles) setAllProfiles(profiles)

      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (data && profiles) {
        const filtered = data.filter((a: Announcement) => {
          if (prof.role === 'admin' || prof.role === 'pastor') return true
          return !a.team_target || a.team_target === prof.team
        })
        setAnnouncements(filtered.map((a: Announcement) => ({
          ...a,
          author: profiles.find((p: Profile) => p.id === a.author_id),
        })))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !profile) return
    setPosting(true)

    const supabase = createClient()
    const { data, error } = await supabase.from('announcements').insert({
      author_id: profile.id,
      team_target: teamTarget || null,
      title: title.trim(),
      content: content.trim(),
      pinned,
    }).select().single()

    if (!error && data) {
      setAnnouncements([{ ...data, author: profile }, ...announcements])
      setTitle('')
      setContent('')
      setTeamTarget('')
      setPinned(false)
    }
    setPosting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este aviso?')) return
    const supabase = createClient()
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(announcements.filter(a => a.id !== id))
  }

  async function toggleComments(announcementId: string) {
    const isExpanded = expandedComments[announcementId]
    if (!isExpanded && !commentsMap[announcementId]) {
      const supabase = createClient()
      const { data } = await supabase.from('announcement_comments').select('*').eq('announcement_id', announcementId).order('created_at', { ascending: true })
      if (data) setCommentsMap(prev => ({ ...prev, [announcementId]: data }))
    }
    setExpandedComments(prev => ({ ...prev, [announcementId]: !isExpanded }))
  }

  async function handlePostComment(announcementId: string, e: React.FormEvent) {
    e.preventDefault()
    const text = newCommentMap[announcementId]
    if (!text?.trim() || !profile) return

    const supabase = createClient()
    const { data } = await supabase.from('announcement_comments').insert({
      announcement_id: announcementId,
      user_id: profile.id,
      user_name: profile.name,
      user_avatar: profile.avatar_url || null,
      content: text.trim(),
    }).select().single()

    if (data) {
      setCommentsMap(prev => ({
        ...prev,
        [announcementId]: [...(prev[announcementId] || []), data],
      }))
      setNewCommentMap(prev => ({ ...prev, [announcementId]: '' }))
    }
  }

  if (loading) return null

  return (
    <div className="fade-in" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>Mural de Atualizações</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>Comunicados e avisos da equipe</p>
      </div>

      {/* New Announcement Form */}
      {canPost && (
        <div className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
          <form onSubmit={handlePost}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título do aviso..."
                required
                style={{ fontSize: 15, fontWeight: 600 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Escreva o comunicado..."
                rows={3}
                required
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <select
                value={teamTarget}
                onChange={e => setTeamTarget(e.target.value as TeamSector)}
                style={{ width: 'auto', fontSize: 12 }}
              >
                <option value="">Todas as equipes</option>
                {Object.entries(TEAM_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} style={{ accentColor: '#fff' }} />
                Fixar no topo
              </label>
              <div style={{ flex: 1 }} />
              <button className="btn btn-primary" type="submit" disabled={posting} style={{ padding: '8px 20px', fontSize: 13 }}>
                {posting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {announcements.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nenhum aviso publicado ainda.</p>
          </div>
        )}

        {announcements.map(a => {
          const comments = commentsMap[a.id] || []
          const isExpanded = expandedComments[a.id]
          const canDelete = profile && (profile.id === a.author_id || profile.role === 'admin' || profile.role === 'pastor')

          return (
            <div key={a.id} className="card" style={{ padding: '24px 28px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                {a.author?.avatar_url ? (
                  <img src={a.author.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--glass-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {initials(a.author?.name || '?')}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.author?.name || 'Desconhecido'}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(a.created_at)}</span>
                    {a.team_target && (
                      <span className="badge badge-team" style={{ fontSize: 9 }}>{TEAM_LABELS[a.team_target]}</span>
                    )}
                    {!a.team_target && (
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: 'var(--glass-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Todas</span>
                    )}
                    {a.pinned && (
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: 'rgba(196,160,80,0.1)', border: '1px solid rgba(196,160,80,0.2)', color: 'var(--gold)' }}>Fixado</span>
                    )}
                  </div>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: 4 }}
                    title="Excluir aviso"
                  >×</button>
                )}
              </div>

              {/* Content */}
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{a.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{a.content}</p>

              {/* Comments toggle */}
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <button
                  onClick={() => toggleComments(a.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {isExpanded ? 'Ocultar comentários' : 'Comentários'}
                </button>

                {isExpanded && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      {comments.length === 0 && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum comentário.</p>
                      )}
                      {comments.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'var(--glass-1)', borderRadius: 10, border: '1px solid var(--border)' }}>
                          {c.user_avatar ? (
                            <img src={c.user_avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--glass-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                              {initials(c.user_name)}
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.user_name}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={e => handlePostComment(a.id, e)} style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Escreva um comentário..."
                        value={newCommentMap[a.id] || ''}
                        onChange={e => setNewCommentMap(prev => ({ ...prev, [a.id]: e.target.value }))}
                        style={{ flex: 1, fontSize: 12, padding: '8px 12px' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12 }} disabled={!(newCommentMap[a.id] || '').trim()}>
                        Enviar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
