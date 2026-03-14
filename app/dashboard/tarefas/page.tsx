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

      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })

      if (prof.role !== 'admin' && prof.role !== 'pastor') {
        query = query.or(`created_by.eq.${prof.id},assigned_to.eq.${prof.id},team_target.eq.${prof.team}`)
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

    // Insert the main task
    const { data: mainTask, error } = await supabase.from('tasks').insert(baseTask).select().single()

    if (!error && mainTask && recurringType && dueDate) {
      // Generate recurring instances
      const instances = generateRecurringDates(dueDate, recurringType, recurringDays, recurringUntil)
      if (instances.length > 0) {
        const childTasks = instances.map(date => ({
          ...baseTask,
          due_date: date,
          parent_task_id: mainTask.id,
          recurring_type: null, // children are not recurring themselves
          recurring_days: null,
          recurring_until: null,
        }))
        await supabase.from('tasks').insert(childTasks)
      }
    }

    setSaving(false)
    if (!error) {
      setTitle(''); setDescription(''); setAssignedTo(''); setDueDate('')
      setTeamTarget(''); setRecurringType(''); setRecurringDays([]); setRecurringUntil('')
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 3000)
      setRefresh(r => r + 1)
    }
  }

  function generateRecurringDates(startDate: string, type: string, days: string[], until: string): string[] {
    const dates: string[] = []
    const start = new Date(startDate + 'T00:00:00')
    const end = until ? new Date(until + 'T00:00:00') : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000) // default 90 days
    const maxInstances = 52 // safety limit

    const dayMap: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 }

    if (type === 'weekly' && days.length > 0) {
      const targetDays = days.map(d => dayMap[d]).filter(d => d !== undefined)
      const cursor = new Date(start.getTime() + 24 * 60 * 60 * 1000) // start from day after
      while (cursor <= end && dates.length < maxInstances) {
        if (targetDays.includes(cursor.getDay())) {
          dates.push(cursor.toISOString().split('T')[0])
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    } else if (type === 'daily') {
      const cursor = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      while (cursor <= end && dates.length < maxInstances) {
        dates.push(cursor.toISOString().split('T')[0])
        cursor.setDate(cursor.getDate() + 1)
      }
    } else if (type === 'monthly') {
      const dayOfMonth = start.getDate()
      const cursor = new Date(start)
      cursor.setMonth(cursor.getMonth() + 1)
      while (cursor <= end && dates.length < maxInstances) {
        cursor.setDate(dayOfMonth)
        dates.push(cursor.toISOString().split('T')[0])
        cursor.setMonth(cursor.getMonth() + 1)
      }
    }

    return dates
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
        <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Nova demanda</h3>

          {/* Templates */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Templates rápidos</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TEMPLATES.map((tpl, i) => (
                <button key={i} type="button" onClick={() => { setTitle(tpl.title); setDescription(tpl.description); setContentType(tpl.type); setPriority(tpl.priority) }}
                  style={{ padding: '5px 12px', fontSize: 11, borderRadius: 8, background: 'var(--glass-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >{tpl.label}</button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateTask}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da tarefa *" required style={{ fontSize: 14, fontWeight: 500 }} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição / Briefing..." rows={2} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Tipo</label>
                <select value={contentType} onChange={e => setContentType(e.target.value as ContentType)} style={{ fontSize: 12 }}>
                  {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Prioridade</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} style={{ fontSize: 12 }}>
                  <option value="1">Alta</option>
                  <option value="2">Média</option>
                  <option value="3">Baixa</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Equipe destino</label>
                <select value={teamTarget} onChange={e => { setTeamTarget(e.target.value as TeamSector); setAssignedTo('') }} style={{ fontSize: 12 }}>
                  <option value="">Todas</option>
                  {Object.entries(TEAM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Atribuir a</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={{ fontSize: 12 }}>
                  <option value="">Sem atribuição</option>
                  {allProfiles
                    .filter(v => v.status === 'ativo' && (!teamTarget || v.team === teamTarget))
                    .map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Prazo</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ fontSize: 12 }} />
              </div>
            </div>

            {/* Recurrence section */}
            <div style={{ background: 'var(--glass-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: recurringType ? 10 : 0 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Repetir:</label>
                <select value={recurringType} onChange={e => { setRecurringType(e.target.value); setRecurringDays([]) }} style={{ fontSize: 12, width: 'auto' }}>
                  <option value="">Não repetir</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                </select>
                {recurringType && (
                  <>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>Até:</label>
                    <input type="date" value={recurringUntil} onChange={e => setRecurringUntil(e.target.value)} style={{ fontSize: 12, width: 'auto' }} />
                  </>
                )}
              </div>

              {recurringType === 'weekly' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(DAYS_LABELS).map(([v, l]) => (
                    <label key={v} style={{
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer',
                      color: recurringDays.includes(v) ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: recurringDays.includes(v) ? 500 : 400,
                    }}>
                      <input type="checkbox" checked={recurringDays.includes(v)}
                        onChange={e => setRecurringDays(prev => e.target.checked ? [...prev, v] : prev.filter(d => d !== v))}
                        style={{ width: 14, height: 14, accentColor: '#fff' }}
                      />
                      {l}
                    </label>
                  ))}
                </div>
              )}

              {recurringType && !dueDate && (
                <p style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6 }}>Defina o prazo acima para gerar as datas recorrentes.</p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-primary" type="submit" disabled={saving} style={{ padding: '10px 24px', fontSize: 13 }}>
                {saving ? 'Criando...' : 'Criar tarefa'}
              </button>
              {formSuccess && <span style={{ fontSize: 13, color: '#34c759' }}>Tarefa criada!</span>}
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
