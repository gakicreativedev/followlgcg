'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, Task, TaskStatus, STATUS_LABELS, CONTENT_TYPE_LABELS } from '@/types/database'
import TaskCard from '@/components/TaskCard'
import { useRouter } from 'next/navigation'

function MetricCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamProfiles, setTeamProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    async function load() {
      const prof = await getCurrentProfile()
      if (!prof) return
      setProfile(prof)

      const supabase = createClient()
      const { data: team } = await supabase.from('profiles').select('*').eq('status', 'ativo')
      if (team) setTeamProfiles(team)

      let query = supabase.from('tasks').select('*').order('due_date', { ascending: true })
      if (prof.role === 'voluntario') {
        query = query.eq('assigned_to', prof.id)
      }
      const { data: taskData } = await query
      if (taskData) {
        const enriched = taskData.map((t: Task) => ({
          ...t,
          assignee: team?.find((p: Profile) => p.id === t.assigned_to),
          creator: team?.find((p: Profile) => p.id === t.created_by),
        }))
        setTasks(enriched)
      }
      setLoading(false)
    }
    load()

  }, [refresh])

  if (loading || !profile) return null

  const counts = {
    total: tasks.length,
    pendente: tasks.filter(t => t.status === 'pendente').length,
    andamento: tasks.filter(t => t.status === 'andamento').length,
    revisao: tasks.filter(t => t.status === 'revisao').length,
    concluido: tasks.filter(t => t.status === 'concluido').length,
  }

  const canEdit = ['pastor', 'lider', 'vice_lider'].includes(profile.role) || profile.role === 'voluntario'

  // Pastor view
  if (profile.role === 'pastor') {
    const byPerson = teamProfiles
      .filter(p => p.role === 'voluntario')
      .map(p => ({
        ...p,
        total: tasks.filter(t => t.assigned_to === p.id).length,
        done: tasks.filter(t => t.assigned_to === p.id && t.status === 'concluido').length,
      }))

    return (
      <div className="fade-in">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Bom dia, {profile.name.split(' ')[0]}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Visão geral da equipe de mídia</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          <MetricCard label="Total" value={counts.total} />
          <MetricCard label="Em andamento" value={counts.andamento} color="var(--blue)" />
          <MetricCard label="Em revisão" value={counts.revisao} color="var(--pink)" />
          <MetricCard label="Concluídas" value={counts.concluido} color="var(--green)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <p className="section-title">Produção da equipe</p>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byPerson.map((p, i) => {
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
                const colors = ['#7c6af7','#3ecf8e','#4a9eff','#f5a623','#e879a0']
                return (
                  <div key={p.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, background: 'var(--bg-elevated)', color: colors[i % colors.length] }}>
                        {initials(p.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.done}/{p.total}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="section-title">Tarefas urgentes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.filter(t => t.priority === 1 && t.status !== 'concluido').slice(0, 4).map(t => (
                <TaskCard key={t.id} task={t} canEdit={false} />
              ))}
              {tasks.filter(t => t.priority === 1 && t.status !== 'concluido').length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma tarefa urgente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Líder / vice-líder view
  if (profile.role === 'lider' || profile.role === 'vice_lider') {
    const byStatus: Record<TaskStatus, Task[]> = {
      pendente: tasks.filter(t => t.status === 'pendente'),
      andamento: tasks.filter(t => t.status === 'andamento'),
      revisao: tasks.filter(t => t.status === 'revisao'),
      concluido: tasks.filter(t => t.status === 'concluido'),
    }

    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600 }}>Painel de tarefas</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Semana atual</p>
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/nova-tarefa')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Nova demanda
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          <MetricCard label="Pendentes" value={counts.pendente} color="var(--amber)" />
          <MetricCard label="Em andamento" value={counts.andamento} color="var(--blue)" />
          <MetricCard label="Em revisão" value={counts.revisao} color="var(--pink)" />
          <MetricCard label="Concluídas" value={counts.concluido} color="var(--green)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {(['pendente', 'andamento', 'revisao', 'concluido'] as TaskStatus[]).map(status => (
            <div key={status}>
              <p className="section-title" style={{ marginBottom: 10 }}>
                <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
                <span style={{ marginLeft: 8 }}>{byStatus[status].length}</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byStatus[status].map(t => (
                  <TaskCard key={t.id} task={t} canEdit={true} onUpdate={() => setRefresh(r => r + 1)} />
                ))}
                {byStatus[status].length === 0 && (
                  <div style={{ padding: '20px 16px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px dashed var(--border)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Nenhuma tarefa</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Voluntário view
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Olá, {profile.name.split(' ')[0]}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Suas tarefas da semana</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        <MetricCard label="A fazer" value={counts.pendente + counts.andamento} />
        <MetricCard label="Em revisão" value={counts.revisao} color="var(--pink)" />
        <MetricCard label="Concluídas" value={counts.concluido} color="var(--green)" />
      </div>

      <p className="section-title">Tarefas atribuídas</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.filter(t => t.status !== 'concluido').map(t => (
          <TaskCard key={t.id} task={t} canEdit={true} onUpdate={() => setRefresh(r => r + 1)} />
        ))}
        {tasks.filter(t => t.status !== 'concluido').length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nenhuma tarefa pendente</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Você está em dia!</p>
          </div>
        )}

        {tasks.filter(t => t.status === 'concluido').length > 0 && (
          <>
            <p className="section-title" style={{ marginTop: 20 }}>Concluídas</p>
            {tasks.filter(t => t.status === 'concluido').map(t => (
              <TaskCard key={t.id} task={t} canEdit={false} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
