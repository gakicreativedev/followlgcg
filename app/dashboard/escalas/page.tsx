'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, MinistryRole, ServiceEvent, ScheduleAssignment, SwapRequest } from '@/types/database'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

type Tab = 'agenda' | 'funcoes' | 'trocas'

export default function EscalasPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [roles, setRoles] = useState<MinistryRole[]>([])
  const [events, setEvents] = useState<ServiceEvent[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('agenda')

  // Event form
  const [showEventForm, setShowEventForm] = useState(false)
  const [evTitle, setEvTitle] = useState('')
  const [evDate, setEvDate] = useState('')
  const [evStart, setEvStart] = useState('')
  const [evEnd, setEvEnd] = useState('')
  const [evNotes, setEvNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Role form
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#6366f1')

  // Assignment form
  const [assignEventId, setAssignEventId] = useState<string | null>(null)
  const [assignRoleId, setAssignRoleId] = useState('')
  const [assignUserId, setAssignUserId] = useState('')

  // Swap form
  const [swapAssignmentId, setSwapAssignmentId] = useState<string | null>(null)
  const [swapTargetId, setSwapTargetId] = useState('')

  const canManage = profile && ['admin', 'pastor', 'lider'].includes(profile.role)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const prof = await getCurrentProfile()
    if (!prof) return
    setProfile(prof)

    const supabase = createClient()
    const [{ data: profiles }, { data: rolesData }, { data: eventsData }, { data: assignmentsData }, { data: swapsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('status', 'ativo'),
      supabase.from('ministry_roles').select('*').order('name'),
      supabase.from('service_events').select('*').order('date', { ascending: true }),
      supabase.from('schedule_assignments').select('*'),
      supabase.from('swap_requests').select('*').eq('status', 'pendente'),
    ])

    if (profiles) setAllProfiles(profiles)
    if (rolesData) setRoles(rolesData)

    if (eventsData && assignmentsData && profiles && rolesData) {
      const enriched = eventsData.map((ev: ServiceEvent) => ({
        ...ev,
        assignments: (assignmentsData as ScheduleAssignment[])
          .filter(a => a.event_id === ev.id)
          .map(a => ({
            ...a,
            role: rolesData.find((r: MinistryRole) => r.id === a.role_id),
            user: profiles.find((p: Profile) => p.id === a.user_id),
          })),
      }))
      setEvents(enriched)
    }

    if (swapsData && profiles && assignmentsData) {
      setSwapRequests((swapsData as SwapRequest[]).map(s => ({
        ...s,
        requester: profiles!.find((p: Profile) => p.id === s.requester_id),
        target_user: profiles!.find((p: Profile) => p.id === s.target_user_id),
        assignment: assignmentsData?.find((a: ScheduleAssignment) => a.id === s.assignment_id),
      })))
    }

    setLoading(false)
  }

  // --- Event CRUD ---
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!evTitle.trim() || !evDate || !evStart || !profile) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('service_events').insert({
      title: evTitle.trim(),
      date: evDate,
      start_time: evStart,
      end_time: evEnd || null,
      notes: evNotes.trim() || null,
      created_by: profile.id,
    })
    setEvTitle(''); setEvDate(''); setEvStart(''); setEvEnd(''); setEvNotes('')
    setShowEventForm(false)
    setSaving(false)
    loadAll()
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('Excluir este culto?')) return
    const supabase = createClient()
    await supabase.from('service_events').delete().eq('id', id)
    loadAll()
  }

  // --- Role CRUD ---
  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoleName.trim() || !profile) return
    const supabase = createClient()
    await supabase.from('ministry_roles').insert({
      name: newRoleName.trim(),
      color: newRoleColor,
      created_by: profile.id,
    })
    setNewRoleName(''); setNewRoleColor('#6366f1')
    loadAll()
  }

  async function handleDeleteRole(id: string) {
    if (!confirm('Excluir esta função?')) return
    const supabase = createClient()
    await supabase.from('ministry_roles').delete().eq('id', id)
    loadAll()
  }

  // --- Assignment CRUD ---
  async function handleAddAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!assignEventId || !assignRoleId || !assignUserId) return
    const supabase = createClient()
    await supabase.from('schedule_assignments').insert({
      event_id: assignEventId,
      role_id: assignRoleId,
      user_id: assignUserId,
    })
    setAssignRoleId(''); setAssignUserId(''); setAssignEventId(null)
    loadAll()
  }

  async function handleRemoveAssignment(id: string) {
    const supabase = createClient()
    await supabase.from('schedule_assignments').delete().eq('id', id)
    loadAll()
  }

  async function handleConfirmAssignment(id: string) {
    const supabase = createClient()
    await supabase.from('schedule_assignments').update({ confirmed: true }).eq('id', id)
    loadAll()
  }

  // --- Swap Requests ---
  async function handleRequestSwap(e: React.FormEvent) {
    e.preventDefault()
    if (!swapAssignmentId || !swapTargetId || !profile) return
    const supabase = createClient()
    await supabase.from('swap_requests').insert({
      assignment_id: swapAssignmentId,
      requester_id: profile.id,
      target_user_id: swapTargetId,
    })
    setSwapAssignmentId(null); setSwapTargetId('')
    loadAll()
  }

  async function handleSwapResponse(id: string, status: 'aceito' | 'recusado') {
    const supabase = createClient()
    if (status === 'aceito') {
      const swap = swapRequests.find(s => s.id === id)
      if (swap && swap.assignment) {
        await supabase.from('schedule_assignments').update({ user_id: swap.target_user_id }).eq('id', swap.assignment_id)
      }
    }
    await supabase.from('swap_requests').update({ status }).eq('id', id)
    loadAll()
  }

  if (loading) return null

  // Filter: upcoming events (today+)
  const today = new Date().toISOString().split('T')[0]
  const upcomingEvents = events.filter(ev => ev.date >= today)
  const pastEvents = events.filter(ev => ev.date < today).reverse().slice(0, 5)

  // My assignments (for volunteers to see their own schedule)
  const myAssignments = events.flatMap(ev =>
    (ev.assignments || []).filter(a => a.user_id === profile?.id).map(a => ({ ...a, event: ev }))
  )

  // Swap requests relevant to me
  const mySwapRequests = swapRequests.filter(s => s.target_user_id === profile?.id)

  return (
    <div className="fade-in" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>Escalas dos Cultos</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>Gerencie as escalas de serviço e funções ministeriais</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {([
          { key: 'agenda' as Tab, label: 'Agenda' },
          ...(canManage ? [{ key: 'funcoes' as Tab, label: 'Funções' }] : []),
          { key: 'trocas' as Tab, label: `Trocas${mySwapRequests.length > 0 ? ` (${mySwapRequests.length})` : ''}` },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--text-primary)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ===== AGENDA TAB ===== */}
      {tab === 'agenda' && (
        <div>
          {/* My upcoming assignments (for all users) */}
          {myAssignments.length > 0 && (
            <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>Minhas escalas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myAssignments
                  .filter(a => (a as any).event.date >= today)
                  .sort((a, b) => (a as any).event.date.localeCompare((b as any).event.date))
                  .map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--glass-1)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.role?.color || '#666', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{(a as any).event.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatDate((a as any).event.date)} · {(a as any).event.start_time?.slice(0, 5)} · {a.role?.name || 'Função'}
                        </p>
                      </div>
                      {!a.confirmed && (
                        <button
                          onClick={() => handleConfirmAssignment(a.id)}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: 11 }}
                        >Confirmar</button>
                      )}
                      {a.confirmed && (
                        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.2)', color: '#34c759' }}>Confirmado</span>
                      )}
                      <button
                        onClick={() => { setSwapAssignmentId(a.id); setTab('trocas') }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}
                      >Trocar</button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Create Event button */}
          {canManage && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setShowEventForm(!showEventForm)}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: 13 }}
              >{showEventForm ? 'Cancelar' : '+ Novo culto'}</button>
            </div>
          )}

          {/* Event Form */}
          {showEventForm && canManage && (
            <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
              <form onSubmit={handleCreateEvent}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Novo culto / evento</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Título *</label>
                    <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Ex: Culto de Domingo" required />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Data *</label>
                    <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Horário início *</label>
                    <input type="time" value={evStart} onChange={e => setEvStart(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Horário fim</label>
                    <input type="time" value={evEnd} onChange={e => setEvEnd(e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Observações</label>
                  <textarea value={evNotes} onChange={e => setEvNotes(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={saving} style={{ padding: '10px 24px', fontSize: 13 }}>
                  {saving ? 'Salvando...' : 'Criar culto'}
                </button>
              </form>
            </div>
          )}

          {/* Upcoming Events */}
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>
            Próximos cultos {upcomingEvents.length > 0 && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({upcomingEvents.length})</span>}
          </h3>

          {upcomingEvents.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nenhum culto agendado.</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {upcomingEvents.map(ev => (
              <div key={ev.id} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Date badge */}
                  <div style={{
                    width: 52, minHeight: 52, borderRadius: 12, background: 'var(--glass-2)', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>
                      {new Date(ev.date + 'T00:00:00').getDate()}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{ev.title}</h4>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {ev.start_time?.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ''}
                      </span>
                    </div>
                    {ev.notes && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{ev.notes}</p>}

                    {/* Assignments */}
                    {(ev.assignments || []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {(ev.assignments || []).map(a => (
                          <div key={a.id} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                            background: 'var(--glass-1)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12,
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.role?.color || '#666' }} />
                            <span style={{ color: 'var(--text-muted)' }}>{a.role?.name}:</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{a.user?.name || '?'}</span>
                            {a.confirmed ? (
                              <span style={{ color: '#34c759', fontSize: 10 }}>✓</span>
                            ) : (
                              <span style={{ color: 'var(--gold)', fontSize: 10 }}>●</span>
                            )}
                            {canManage && (
                              <button onClick={() => handleRemoveAssignment(a.id)} style={{
                                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 0, marginLeft: 2,
                              }}>×</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Assignment (inline) */}
                    {canManage && assignEventId === ev.id && (
                      <form onSubmit={handleAddAssignment} style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                        <select value={assignRoleId} onChange={e => setAssignRoleId(e.target.value)} style={{ width: 'auto', fontSize: 12 }}>
                          <option value="">Função...</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)} style={{ width: 'auto', fontSize: 12 }}>
                          <option value="">Pessoa...</option>
                          {allProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 11 }} disabled={!assignRoleId || !assignUserId}>
                          Adicionar
                        </button>
                        <button type="button" onClick={() => setAssignEventId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                          Cancelar
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => setAssignEventId(assignEventId === ev.id ? null : ev.id)}
                        style={{
                          background: 'var(--glass-2)', border: '1px solid var(--border)', borderRadius: 8,
                          padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer',
                        }}
                      >+ Escalar</button>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        style={{
                          background: 'none', border: '1px solid rgba(255,59,48,0.2)', borderRadius: 8,
                          padding: '6px 10px', fontSize: 13, color: '#ff3b30', cursor: 'pointer',
                        }}
                      >×</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-muted)' }}>Cultos anteriores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pastEvents.map(ev => (
                  <div key={ev.id} style={{ padding: '12px 16px', background: 'var(--glass-1)', borderRadius: 10, border: '1px solid var(--border)', opacity: 0.6, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{formatDate(ev.date)}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ev.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.start_time?.slice(0, 5)}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(ev.assignments || []).length} escalados</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== FUNÇÕES TAB ===== */}
      {tab === 'funcoes' && canManage && (
        <div>
          <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Funções ministeriais</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              Crie funções como Louvor, Projeção, Recepção, etc. para usar nas escalas.
            </p>

            <form onSubmit={handleCreateRole} style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
              <input
                type="color"
                value={newRoleColor}
                onChange={e => setNewRoleColor(e.target.value)}
                style={{ width: 36, height: 36, padding: 2, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'transparent' }}
              />
              <input
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="Nome da função (ex: Louvor, Projeção...)"
                style={{ flex: 1, fontSize: 13 }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 13 }} disabled={!newRoleName.trim()}>
                Criar
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roles.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma função criada ainda.</p>
              )}
              {roles.map(r => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: 'var(--glass-1)', borderRadius: 10, border: '1px solid var(--border)',
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</span>
                  <button
                    onClick={() => handleDeleteRole(r.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== TROCAS TAB ===== */}
      {tab === 'trocas' && (
        <div>
          {/* Request swap form */}
          {swapAssignmentId && (
            <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Solicitar troca</h3>
              <form onSubmit={handleRequestSwap} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select value={swapTargetId} onChange={e => setSwapTargetId(e.target.value)} style={{ flex: 1, fontSize: 13 }}>
                  <option value="">Trocar com quem?</option>
                  {allProfiles.filter(p => p.id !== profile?.id).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 13 }} disabled={!swapTargetId}>
                  Solicitar
                </button>
                <button type="button" onClick={() => setSwapAssignmentId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                  Cancelar
                </button>
              </form>
            </div>
          )}

          {/* Pending swap requests for me */}
          {mySwapRequests.length > 0 && (
            <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>Pedidos de troca para mim</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mySwapRequests.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: 'var(--glass-1)', borderRadius: 10, border: '1px solid var(--border)',
                  }}>
                    {s.requester?.avatar_url ? (
                      <img src={s.requester.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--glass-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {initials(s.requester?.name || '?')}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {s.requester?.name || '?'} quer trocar com você
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleSwapResponse(s.id, 'aceito')}
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: 11 }}
                      >Aceitar</button>
                      <button
                        onClick={() => handleSwapResponse(s.id, 'recusado')}
                        style={{
                          padding: '6px 14px', fontSize: 11, borderRadius: 8, cursor: 'pointer',
                          background: 'none', border: '1px solid rgba(255,59,48,0.2)', color: '#ff3b30',
                        }}
                      >Recusar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All pending swaps (for leaders) */}
          {canManage && swapRequests.length > 0 && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-primary)' }}>Todas as trocas pendentes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {swapRequests.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: 'var(--glass-1)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.requester?.name || '?'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.target_user?.name || '?'}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, background: 'rgba(196,160,80,0.1)', border: '1px solid rgba(196,160,80,0.2)', color: 'var(--gold)' }}>Pendente</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mySwapRequests.length === 0 && swapRequests.length === 0 && !swapAssignmentId && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nenhuma troca pendente.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
