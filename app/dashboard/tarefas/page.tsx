'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile, Task, TaskStatus, ContentType, STATUS_LABELS, CONTENT_TYPE_LABELS, TEAM_LABELS, TeamSector } from '@/types/database'
import TaskCard from '@/components/TaskCard'

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all')
  const [filterTeam, setFilterTeam] = useState<TeamSector | 'all'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('email', user.email).single()
      if (!prof) return
      setProfile(prof)

      const { data: team } = await supabase.from('profiles').select('*')
      
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })
      
      // Filtros de acesso baseados na equipe
      if (prof.role !== 'admin' && prof.role !== 'pastor') {
        // Se for gestao_instagram ou trafego (os que criam demanda), eles veem tudo que criaram
        // Se for execucao (video, projecao, etc), veem as que estao endereçadas pra equipe deles
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

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Todas as tarefas</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{tasks.length} tarefas no total</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {viewMode === 'list' && (
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')}
              style={{ width: 'auto' }}
            >
              <option value="all">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as ContentType | 'all')}
            style={{ width: 'auto' }}
          >
            <option value="all">Tipos de conteúdo (Todos)</option>
            {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value as TeamSector | 'all')}
            style={{ width: 'auto' }}
          >
            <option value="all">Equipes destinadas (Todas)</option>
            {Object.entries(TEAM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', background: 'var(--glass-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          <button 
            onClick={() => setViewMode('kanban')}
            style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: viewMode === 'kanban' ? 600 : 400, background: viewMode === 'kanban' ? 'var(--glass-2)' : 'transparent', color: viewMode === 'kanban' ? 'var(--text-primary)' : 'var(--text-muted)', border: viewMode === 'kanban' ? '1px solid var(--border-strong)' : '1px solid transparent', cursor: 'pointer' }}
          >
            Quadro (Kanban)
          </button>
          <button 
            onClick={() => setViewMode('list')}
            style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: viewMode === 'list' ? 600 : 400, background: viewMode === 'list' ? 'var(--glass-2)' : 'transparent', color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)', border: viewMode === 'list' ? '1px solid var(--border-strong)' : '1px solid transparent', cursor: 'pointer' }}
          >
            Lista
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} canEdit={!!canEdit} onUpdate={() => setRefresh(r => r + 1)} />
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
            const columnTasks = filtered.filter(t => t.status === status);
            return (
              <div key={status} style={{ background: 'var(--glass-1)', border: '1px solid var(--border)', borderRadius: 14, padding: 12, minHeight: 400 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</h3>
                  <span style={{ fontSize: 10, background: 'var(--glass-2)', padding: '2px 8px', borderRadius: 99, color: 'var(--text-muted)' }}>{columnTasks.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {columnTasks.map(t => (
                    <TaskCard key={t.id} task={t} canEdit={!!canEdit} onUpdate={() => setRefresh(r => r + 1)} />
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
