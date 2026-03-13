'use client'
import { Task, STATUS_LABELS, CONTENT_TYPE_LABELS, TaskStatus } from '@/types/database'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

interface TaskCardProps {
  task: Task
  canEdit?: boolean
  onUpdate?: () => void
}

const PRIORITY_LABELS = ['', 'Alta', 'Média', 'Baixa']

const STATUS_NEXT: Record<TaskStatus, TaskStatus | null> = {
  pendente: 'andamento',
  andamento: 'revisao',
  revisao: 'concluido',
  concluido: null,
}

function formatDate(date?: string) {
  if (!date) return ''
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function TaskCard({ task, canEdit = false, onUpdate }: TaskCardProps) {
  const [loading, setLoading] = useState(false)

  const nextStatus = STATUS_NEXT[task.status]

  async function advanceStatus() {
    if (!nextStatus || loading) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('task_history').insert({
        task_id: task.id,
        changed_by: user.id,
        old_status: task.status,
        new_status: nextStatus,
      })
    }
    setLoading(false)
    onUpdate?.()
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 16px',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span className={`badge badge-${task.content_type}`}>{CONTENT_TYPE_LABELS[task.content_type]}</span>
            <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
            {task.priority === 1 && (
              <span style={{ fontSize: 11, color: 'var(--red)' }}>● Alta prioridade</span>
            )}
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{task.title}</p>
          {task.description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{task.description}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {task.assignee && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>@</span> {task.assignee.name}
              </span>
            )}
            {task.due_date && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Prazo: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(task.due_date)}</span>
              </span>
            )}
          </div>
        </div>

        {canEdit && nextStatus && (
          <button
            className="btn"
            onClick={advanceStatus}
            disabled={loading}
            style={{ fontSize: 11, padding: '6px 12px', flexShrink: 0 }}
          >
            {loading ? '...' : `→ ${STATUS_LABELS[nextStatus]}`}
          </button>
        )}
      </div>
    </div>
  )
}
