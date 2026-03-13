'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, Task, TaskStatus, STATUS_LABELS, CONTENT_TYPE_LABELS, TEAM_LABELS, TeamSector } from '@/types/database'
import TaskCard from '@/components/TaskCard'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

  // Admin / Pastor view
  if (profile.role === 'admin' || profile.role === 'pastor') {
    const teams = Object.keys(TEAM_LABELS) as TeamSector[]

    return (
      <div className="fade-in">
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Bom dia, {profile.name.split(' ')[0]}</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 400, letterSpacing: '-0.01em' }}>Visão geral da sua Igreja</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 36 }}>
          <MetricCard label="Total" value={counts.total} />
          <MetricCard label="Em andamento" value={counts.andamento} color="var(--blue)" />
          <MetricCard label="Em revisão" value={counts.revisao} color="var(--pink)" />
          <MetricCard label="Concluídas" value={counts.concluido} color="var(--green)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <p className="section-title">Nossas Equipes</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {teams.map(t => {
                const teamUsers = teamProfiles.filter(p => p.team === t).length
                const teamTasksTotal = tasks.filter(task => task.team_target === t).length
                const teamTasksDone = tasks.filter(task => task.team_target === t && task.status === 'concluido').length
                const teamTasksPending = teamTasksTotal - teamTasksDone

                return (
                  <Link href={`/dashboard/equipes/${t}`} key={t} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--glass-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 18,
                      padding: '20px',
                      transition: 'all 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
                      cursor: 'pointer',
                      boxShadow: '0 2px 16px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-highlight)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.1)'; }}
                    >
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{TEAM_LABELS[t]}</h3>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Membros ativos</p>
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{teamUsers}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tarefas</p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{teamTasksPending}</span> pend. / <span style={{ color: 'var(--green)' }}>{teamTasksDone}</span> concl.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
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
