'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Task, CONTENT_TYPE_LABELS } from '@/types/database'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const TYPE_COLORS: Record<string, string> = {
  post_story: '#7c6af7',
  carrossel: '#4a9eff',
  reels: '#e879a0',
  video_elaborado: '#f56565',
  arte_grafica: '#3ecf8e',
}

export default function CalendarioPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(name)').order('due_date').then(({ data }) => {
      if (data) setTasks(data as unknown as Task[])
    })
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const tasksByDay: Record<number, Task[]> = {}
  tasks.forEach(t => {
    if (!t.due_date) return
    const d = new Date(t.due_date + 'T00:00:00')
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!tasksByDay[day]) tasksByDay[day] = []
      tasksByDay[day].push(t)
    }
  })

  const selectedTasks = selected ? (tasksByDay[selected] || []) : []
  const today = new Date()

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Calendário de publicações</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Prazos e entregas do mês</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 500, minWidth: 140, textAlign: 'center' }}>{MONTH_NAMES[month]} {year}</span>
          <button className="btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)' }}>
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: 80, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
              const dayTasks = tasksByDay[day] || []
              const isSelected = selected === day

              return (
                <div
                  key={day}
                  onClick={() => setSelected(isSelected ? null : day)}
                  style={{
                    minHeight: 80, padding: '8px 6px',
                    borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                    cursor: dayTasks.length > 0 ? 'pointer' : 'default',
                    background: isSelected ? 'var(--accent-light)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%', fontSize: 12,
                    background: isToday ? 'var(--accent)' : 'transparent',
                    color: isToday ? 'white' : 'var(--text-secondary)',
                    fontWeight: isToday ? 600 : 400,
                  }}>{day}</span>
                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayTasks.slice(0, 3).map(t => (
                      <div key={t.id} style={{
                        height: 4, borderRadius: 2,
                        background: TYPE_COLORS[t.content_type] || 'var(--accent)',
                      }} />
                    ))}
                    {dayTasks.length > 3 && (
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{dayTasks.length - 3}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="section-title">{selected ? `Dia ${selected}` : 'Selecione um dia'}</p>
          {selected && selectedTasks.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma tarefa</p>
            </div>
          )}
          {!selected && (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Clique em um dia com tarefas para ver os detalhes</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedTasks.map(t => (
              <div key={t.id} className="card" style={{ borderLeft: `3px solid ${TYPE_COLORS[t.content_type] || 'var(--accent)'}`, borderRadius: '0 10px 10px 0', padding: '12px 14px' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{t.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{CONTENT_TYPE_LABELS[t.content_type]}</p>
                {t.assignee && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>@ {(t.assignee as unknown as { name: string }).name}</p>}
                <span className={`badge badge-${t.status}`} style={{ marginTop: 6 }}>{t.status}</span>
              </div>
            ))}
          </div>

          <div className="divider" style={{ marginTop: 20 }} />
          <p className="section-title">Legenda</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 4, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
