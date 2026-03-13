'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile, Task, TaskStatus, ContentType, STATUS_LABELS, CONTENT_TYPE_LABELS } from '@/types/database'
import TaskCard from '@/components/TaskCard'

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all')
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
      const { data: taskData } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
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

  const canEdit = profile && ['pastor', 'lider', 'vice_lider'].includes(profile.role)

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Todas as tarefas</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{tasks.length} tarefas no total</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')}
          style={{ width: 'auto' }}
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as ContentType | 'all')}
          style={{ width: 'auto' }}
        >
          <option value="all">Todos os tipos</option>
          {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

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
    </div>
  )
}
