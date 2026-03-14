'use client'
import { Task, STATUS_LABELS, CONTENT_TYPE_LABELS, TaskStatus, TEAM_LABELS } from '@/types/database'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import TaskModal from './TaskModal'

interface TaskCardProps {
  task: Task
  canEdit?: boolean
  onUpdate?: () => void
  onDelete?: () => void
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

export default function TaskCard({ task, canEdit = false, onUpdate, onDelete }: TaskCardProps) {
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const nextStatus = STATUS_NEXT[task.status]

  async function advanceStatus(e: React.MouseEvent) {
    e.stopPropagation()
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

  const isOverdue = task.due_date && task.status !== 'concluido' && new Date(task.due_date + 'T23:59:59') < new Date()
  const daysOverdue = isOverdue ? Math.ceil((Date.now() - new Date(task.due_date + 'T23:59:59').getTime()) / 86400000) : 0

  return (
    <>
      <div style={{
        background: 'var(--glass-2)',
        border: isOverdue ? '1px solid rgba(239,107,107,0.4)' : '1px solid var(--border)',
        borderRadius: 16,
        padding: '18px 20px',
        transition: 'all 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: isOverdue ? '0 2px 16px rgba(239,107,107,0.12)' : '0 2px 16px rgba(0,0,0,0.15)',
        cursor: 'pointer'
      }}
      onClick={() => setIsModalOpen(true)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = isOverdue ? 'rgba(239,107,107,0.6)' : 'var(--border-strong)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = isOverdue ? '0 6px 24px rgba(239,107,107,0.2)' : '0 6px 24px rgba(0,0,0,0.25)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isOverdue ? 'rgba(239,107,107,0.4)' : 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isOverdue ? '0 2px 16px rgba(239,107,107,0.12)' : '0 2px 16px rgba(0,0,0,0.15)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {isOverdue && (
                <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600, background: 'rgba(239,107,107,0.1)', padding: '2px 8px', borderRadius: 99 }}>● Atrasada {daysOverdue}d</span>
              )}
              {task.team_target && (
              <span className="badge badge-team" style={{ fontSize: 9, opacity: 0.9 }}>{TEAM_LABELS[task.team_target]}</span>
            )}
            <span className="badge badge-type" style={{ fontSize: 9, opacity: 0.8 }}>{CONTENT_TYPE_LABELS[task.content_type]}</span>
            {task.priority === 1 && (
              <span style={{ fontSize: 10, color: 'var(--accent-light)', fontWeight: 600, background: 'var(--glass-3)', padding: '2px 8px', borderRadius: 99 }}>● Alta</span>
            )}
            {task.recurring_type && (
              <span style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 500, background: 'var(--blue-bg)', padding: '2px 8px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {task.recurring_type === 'daily' ? 'Diaria' : task.recurring_type === 'weekly' ? 'Semanal' : 'Mensal'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{task.title}</p>
          {task.description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{task.description}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {task.assignee && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {task.assignee.avatar_url ? (
                  <img src={task.assignee.avatar_url} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                ) : null}
                <span style={{ color: 'var(--text-secondary)' }}>@</span> {task.assignee.name}
                {task.assignee.team && (
                  <span className="badge badge-team" style={{ fontSize: 8, padding: '2px 6px', marginLeft: 2 }}>{TEAM_LABELS[task.assignee.team]}</span>
                )}
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
              onClick={advanceStatus}
              disabled={loading}
              style={{ 
                fontSize: 10, padding: '6px 10px', flexShrink: 0, borderRadius: 8,
                background: 'var(--glass-3)', color: 'var(--text-primary)', border: '1px solid var(--border)',
                cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-3)'}
            >
              {loading ? '...' : `→ ${STATUS_LABELS[nextStatus]}`}
            </button>
          )}
        </div>
      </div>

      <TaskModal
        task={task}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={() => onUpdate?.()}
        onDelete={() => { setIsModalOpen(false); onDelete?.() }}
      />
    </>
  )
}
