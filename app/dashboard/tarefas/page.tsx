'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile, Task, TaskStatus, ContentType, STATUS_LABELS, CONTENT_TYPE_LABELS, TEAM_LABELS, TeamSector, DAYS_LABELS } from '@/types/database'
import TaskCard from '@/components/TaskCard'

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all')
  const [filterTeam, setFilterTeam] = useState<TeamSector | 'all'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')
  const [refresh, setRefresh] = useState(0)

  // New task form
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState<ContentType>('post_story')
  const [teamTarget, setTeamTarget] = useState<TeamSector | ''>('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('2')
  const [saving, setSaving] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)

  // Recurrence
  const [recurringType, setRecurringType] = useState<string>('')
  const [recurringDays, setRecurringDays] = useState<string[]>([])
  const [recurringUntil, setRecurringUntil] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('email', user.email).single()
      if (!prof) return
      setProfile(prof)

      const { data: team } = await supabase.from('profiles').select('*')
      if (team) setAllProfiles(team)

      let query = supabase.from('tasks').select('*').is('parent_task_id', null).order('created_at', { ascending: false })

      if (prof.role !== 'admin' && prof.role !== 'pastor') {
        query = query.or(`created_by.eq.${prof.id},assigned_to.eq.${prof.id},team_target.eq.${prof.team}`)
      }

      // Default team filter for non-admin users
      if (prof.role !== 'admin' && prof.role !== 'pastor' && prof.team) {
        setFilterTeam(prof.team)
      }

      const { data: taskData } = await query
      if (taskData && team) {
        setTasks(taskData.map((t: Task) => ({
          ...t,
          assignee: (team as Profile[]).find(p => p.id === t.assigned_to),
          creator: (team as Profile[]).find(p => p.id === t.created_by),
        })))
      }
    }
    load()
  }, [refresh])

  const filtered = tasks
    .filter(t => filterStatus === 'all' || t.status === filterStatus)
    .filter(t => filterType === 'all' || t.content_type === filterType)
    .filter(t => filterTeam === 'all' || t.team_target === filterTeam)

  const canEdit = profile && ['admin', 'pastor', 'lider', 'vice_lider'].includes(profile.role)
  const canCreate = profile && ['admin', 'pastor', 'lider', 'vice_lider'].includes(profile.role)

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !profile) return
    setSaving(true)

    const supabase = createClient()

    // Build the base task data
    const baseTask = {
      title: title.trim(),
      description: description || null,
      content_type: contentType,
      team_target: teamTarget || null,
      assigned_to: assignedTo || null,
      created_by: profile.id,
      due_date: dueDate || null,
      priority: parseInt(priority),
      status: 'pendente' as const,
      recurring_type: recurringType || null,
      recurring_days: recurringType === 'weekly' && recurringDays.length > 0 ? recurringDays : null,
      recurring_until: recurringUntil || null,
    }

    // Insert the main task (recurrence metadata is stored on the task itself, no child tasks)
    const { error } = await supabase.from('tasks').insert(baseTask)

    setSaving(false)
    if (!error) {
      setTitle(''); setDescription(''); setAssignedTo(''); setDueDate('')
      setTeamTarget(''); setRecurringType(''); setRecurringDays([]); setRecurringUntil('')
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 3000)
      setRefresh(r => r + 1)
    }
  }

  const RECURRING_LABELS: Record<string, string> = {
    daily: 'Diária',
    weekly: 'Semanal',
    monthly: 'Mensal',
  }

  const TEMPLATES = [
    { label: 'Post Semanal', title: 'Post Semanal — [Data]', description: 'Arte para post da semana. Referência: tema do culto.', type: 'post_story' as ContentType, priority: '2' },
    { label: 'Reels Domingo', title: 'Reels do Culto — [Data]', description: 'Reels curto com cortes do louvor e pregação.', type: 'reels' as ContentType, priority: '1' },
    { label: 'Carrossel', title: 'Carrossel — [Tema]', description: 'Carrossel informativo/devocional. 5-8 slides.', type: 'carrossel' as ContentType, priority: '2' },
    { label: 'Arte Gráfica', title: 'Arte — [Evento]', description: 'Arte para divulgação de evento/programação.', type: 'arte_grafica' as ContentType, priority: '2' },
    { label: 'Vídeo Completo', title: 'Vídeo — [Evento]', description: 'Vídeo completo com edição profissional.', type: 'video_elaborado' as ContentType, priority: '1' },
  ]

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Tarefas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{tasks.length} tarefas no total</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: 13 }}
          >{showForm ? 'Fechar' : '+ Nova demanda'}</button>
        )}
      </div>

      {/* Inline Task Creation Form */}
      {showForm && canCreate && (
        <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
          {/* Form header */}
          <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)', background: 'var(--glass-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Nova demanda</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>x</button>
            </div>
            {/* Templates */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {TEMPLATES.map((tpl, i) => (
                <button key={i} type="button" onClick={() => { setTitle(tpl.title); setDescription(tpl.description); setContentType(tpl.type); setPriority(tpl.priority) }}
                  style={{
                    padding: '5px 12px', fontSize: 11, borderRadius: 99,
                    background: 'var(--glass-2)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >{tpl.label}</button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateTask} style={{ padding: '20px 28px 24px' }}>
            {/* Title - prominent input */}
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Titulo da tarefa..."
              required
              style={{
                width: '100%', fontSize: 16, fontWeight: 500, padding: '12px 0',
                background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
                color: 'var(--text-primary)', outline: 'none', marginBottom: 16,
              }}
            />

            {/* Description */}
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Descricao, briefing, referencias..."
              rows={2}
              style={{
                width: '100%', fontSize: 13, padding: '10px 0', resize: 'vertical',
                background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
                color: 'var(--text-secondary)', outline: 'none', marginBottom: 20, lineHeight: 1.6,
              }}
            />

            {/* Row 1: Tipo, Prioridade, Equipe */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tipo</label>
                <select value={contentType} onChange={e => setContentType(e.target.value as ContentType)}>
                  {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prioridade</label>
                <select value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="1">Alta</option>
                  <option value="2">Media</option>
                  <option value="3">Baixa</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Equipe</label>
                <select value={teamTarget} onChange={e => { setTeamTarget(e.target.value as TeamSector); setAssignedTo('') }}>
                  <option value="">Todas</option>
                  {Object.entries(TEAM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Atribuir, Prazo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Atribuir a</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="">Sem atribuicao</option>
                  {allProfiles
                    .filter(v => v.status === 'ativo' && (!teamTarget || v.team === teamTarget))
                    .map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prazo</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            {/* Recurrence - collapsible */}
            <div style={{
              border: '1px solid var(--border)', borderRadius: 12, marginBottom: 20,
              overflow: 'hidden', transition: 'all 0.2s',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                background: recurringType ? 'var(--glass-2)' : 'transparent',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <select value={recurringType} onChange={e => { setRecurringType(e.target.value); setRecurringDays([]) }}
                  style={{ fontSize: 13, border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', flex: 1 }}>
                  <option value="">Nao repetir</option>
                  <option value="daily">Repetir diariamente</option>
                  <option value="weekly">Repetir semanalmente</option>
                  <option value="monthly">Repetir mensalmente</option>
                </select>
                {recurringType && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ate</span>
                    <input type="date" value={recurringUntil} onChange={e => setRecurringUntil(e.target.value)}
                      style={{ fontSize: 12, border: 'none', background: 'transparent', color: 'var(--text-primary)' }} />
                  </div>
                )}
              </div>

              {recurringType === 'weekly' && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.entries(DAYS_LABELS).map(([v, l]) => (
                    <button key={v} type="button"
                      onClick={() => setRecurringDays(prev => prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v])}
                      style={{
                        padding: '4px 10px', fontSize: 11, borderRadius: 99, cursor: 'pointer',
                        fontWeight: recurringDays.includes(v) ? 600 : 400,
                        background: recurringDays.includes(v) ? 'var(--glass-3)' : 'transparent',
                        border: recurringDays.includes(v) ? '1px solid var(--border-strong)' : '1px solid var(--border)',
                        color: recurringDays.includes(v) ? 'var(--text-primary)' : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >{l.slice(0, 3)}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-primary" type="submit" disabled={saving} style={{ padding: '11px 28px', fontSize: 14 }}>
                {saving ? 'Criando...' : 'Criar tarefa'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn" style={{ padding: '11px 20px', fontSize: 13 }}>
                Cancelar
              </button>
              {formSuccess && <span style={{ fontSize: 13, color: '#34c759', fontWeight: 500 }}>Tarefa criada com sucesso!</span>}
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {viewMode === 'list' && (
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')} style={{ width: 'auto' }}>
              <option value="all">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
          <select value={filterType} onChange={e => setFilterType(e.target.value as ContentType | 'all')} style={{ width: 'auto' }}>
            <option value="all">Tipos de conteúdo (Todos)</option>
            {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value as TeamSector | 'all')} style={{ width: 'auto' }}>
            <option value="all">Equipes destinadas (Todas)</option>
            {Object.entries(TEAM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', background: 'var(--glass-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          <button onClick={() => setViewMode('kanban')}
            style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: viewMode === 'kanban' ? 600 : 400, background: viewMode === 'kanban' ? 'var(--glass-2)' : 'transparent', color: viewMode === 'kanban' ? 'var(--text-primary)' : 'var(--text-muted)', border: viewMode === 'kanban' ? '1px solid var(--border-strong)' : '1px solid transparent', cursor: 'pointer' }}
          >Quadro (Kanban)</button>
          <button onClick={() => setViewMode('list')}
            style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: viewMode === 'list' ? 600 : 400, background: viewMode === 'list' ? 'var(--glass-2)' : 'transparent', color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)', border: viewMode === 'list' ? '1px solid var(--border-strong)' : '1px solid transparent', cursor: 'pointer' }}
          >Lista</button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} canEdit={!!canEdit} onUpdate={() => setRefresh(r => r + 1)} onDelete={() => setRefresh(r => r + 1)} />
          ))}
          {filtered.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nenhuma tarefa encontrada</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start', overflowX: 'auto', paddingBottom: 16 }}>
          {(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([status, label]) => {
            const columnTasks = filtered.filter(t => t.status === status)
            return (
              <div key={status} style={{ background: 'var(--glass-1)', border: '1px solid var(--border)', borderRadius: 14, padding: 12, minHeight: 400 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</h3>
                  <span style={{ fontSize: 10, background: 'var(--glass-2)', padding: '2px 8px', borderRadius: 99, color: 'var(--text-muted)' }}>{columnTasks.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {columnTasks.map(t => (
                    <TaskCard key={t.id} task={t} canEdit={!!canEdit} onUpdate={() => setRefresh(r => r + 1)} onDelete={() => setRefresh(r => r + 1)} />
                  ))}
                  {columnTasks.length === 0 && (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: 'var(--gray-600)' }}>Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
