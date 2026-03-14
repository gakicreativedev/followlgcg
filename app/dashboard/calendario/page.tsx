'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, Task, STATUS_LABELS, CONTENT_TYPE_LABELS, TEAM_LABELS } from '@/types/database'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  tasks: Task[]
}

export default function CalendarioPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    async function load() {
      const prof = await getCurrentProfile()
      if (!prof) return
      setProfile(prof)

      const supabase = createClient()
      const { data: team } = await supabase.from('profiles').select('*').eq('status', 'ativo')

      let query = supabase.from('tasks').select('*').is('parent_task_id', null)
      if (prof.role === 'voluntario') {
        query = query.or(`assigned_to.eq.${prof.id},team_target.eq.${prof.team}`)
      }
      const { data: taskData } = await query
      if (taskData && team) {
        setTasks(taskData.map((t: Task) => ({
          ...t,
          assignee: (team as Profile[]).find(p => p.id === t.assigned_to),
          creator: (team as Profile[]).find(p => p.id === t.created_by),
        })))
      }
      setLoading(false)
    }
    load()
  }, [])

  // Expand recurring tasks into the visible calendar range
  function getRecurringDatesInRange(task: Task, rangeStart: Date, rangeEnd: Date): string[] {
    if (!task.recurring_type || !task.due_date) return []
    const dates: string[] = []
    const start = new Date(task.due_date + 'T00:00:00')
    const until = task.recurring_until ? new Date(task.recurring_until + 'T00:00:00') : new Date(rangeEnd)
    const end = until < rangeEnd ? until : rangeEnd
    const dayMap: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 }

    if (task.recurring_type === 'weekly' && task.recurring_days && task.recurring_days.length > 0) {
      const targetDays = task.recurring_days.map(d => dayMap[d]).filter(d => d !== undefined)
      const cursor = new Date(Math.max(start.getTime(), rangeStart.getTime()))
      while (cursor <= end) {
        const dateStr = cursor.toISOString().split('T')[0]
        if (targetDays.includes(cursor.getDay()) && dateStr !== task.due_date) {
          dates.push(dateStr)
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    } else if (task.recurring_type === 'daily') {
      const cursor = new Date(Math.max(start.getTime() + 86400000, rangeStart.getTime()))
      while (cursor <= end) {
        dates.push(cursor.toISOString().split('T')[0])
        cursor.setDate(cursor.getDate() + 1)
      }
    } else if (task.recurring_type === 'monthly') {
      const dayOfMonth = start.getDate()
      const cursor = new Date(Math.max(start.getTime(), rangeStart.getTime()))
      cursor.setDate(1) // go to first of month
      while (cursor <= end) {
        const testDate = new Date(cursor.getFullYear(), cursor.getMonth(), dayOfMonth)
        const testStr = testDate.toISOString().split('T')[0]
        if (testDate >= rangeStart && testDate <= end && testStr !== task.due_date) {
          dates.push(testStr)
        }
        cursor.setMonth(cursor.getMonth() + 1)
      }
    }
    return dates
  }

  function getCalendarDays(): CalendarDay[] {
    const firstDay = new Date(year, month, 1)
    const startDay = new Date(firstDay)
    startDay.setDate(startDay.getDate() - startDay.getDay())
    const endDay = new Date(startDay)
    endDay.setDate(endDay.getDate() + 41)

    // Build a map of date -> tasks (including recurring expansions)
    const dateTaskMap: Record<string, Task[]> = {}

    for (const task of tasks) {
      // Original due_date
      if (task.due_date) {
        if (!dateTaskMap[task.due_date]) dateTaskMap[task.due_date] = []
        dateTaskMap[task.due_date].push(task)
      }
      // Recurring virtual dates
      if (task.recurring_type) {
        const recurDates = getRecurringDatesInRange(task, startDay, endDay)
        for (const d of recurDates) {
          if (!dateTaskMap[d]) dateTaskMap[d] = []
          dateTaskMap[d].push({ ...task, _isRecurringInstance: true } as Task & { _isRecurringInstance: boolean })
        }
      }
    }

    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDay)
      date.setDate(startDay.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        tasks: dateTaskMap[dateStr] || [],
      })
    }
    return days
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  function goToday() {
    setCurrentDate(new Date())
    setSelectedDay(null)
  }

  if (loading || !profile) return null

  const days = getCalendarDays()
  const tasksThisMonth = tasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date + 'T00:00:00')
    return d.getMonth() === month && d.getFullYear() === year
  })

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>Calendário</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 6, letterSpacing: '-0.01em' }}>
            {tasksThisMonth.length} tarefa{tasksThisMonth.length !== 1 ? 's' : ''} este mês
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={prevMonth} style={{ padding: '8px 14px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn" onClick={goToday} style={{ fontSize: 13 }}>Hoje</button>
          <button className="btn" onClick={nextMonth} style={{ padding: '8px 14px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginLeft: 12, minWidth: 200 }}>
            {MONTHS[month]} {year}
          </h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 340px' : '1fr', gap: 24 }}>
        {/* Calendar Grid */}
        <div>
          {/* Weekday Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
            {WEEKDAYS.map(day => (
              <div key={day} style={{
                textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {days.map((day, i) => {
              const isSelected = selectedDay?.date.getTime() === day.date.getTime()
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(day.tasks.length > 0 || day.isCurrentMonth ? day : null)}
                  style={{
                    minHeight: 90,
                    padding: '8px 10px',
                    background: isSelected ? 'var(--glass-3)' : day.isCurrentMonth ? 'var(--glass-1)' : 'transparent',
                    border: isSelected ? '1px solid var(--border-highlight)' : day.isToday ? '1px solid var(--border-strong)' : '1px solid var(--border)',
                    borderRadius: 12,
                    cursor: day.isCurrentMonth ? 'pointer' : 'default',
                    transition: 'all 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
                    opacity: day.isCurrentMonth ? 1 : 0.3,
                  }}
                  onMouseEnter={e => { if (day.isCurrentMonth) e.currentTarget.style.background = 'var(--glass-2)' }}
                  onMouseLeave={e => { if (day.isCurrentMonth && !isSelected) e.currentTarget.style.background = 'var(--glass-1)' }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: day.isToday ? 700 : 500,
                    color: day.isToday ? '#fff' : day.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                    marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {day.isToday ? (
                      <span style={{
                        background: 'rgba(255,255,255,0.15)', borderRadius: 99,
                        width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700
                      }}>
                        {day.date.getDate()}
                      </span>
                    ) : (
                      day.date.getDate()
                    )}
                  </div>

                  {/* Task dots */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {day.tasks.slice(0, 3).map((t, i) => (
                      <div key={t.id + '-' + i} style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: t.status === 'concluido' ? 'var(--green-bg)' : t.status === 'andamento' ? 'var(--blue-bg)' : 'var(--glass-3)',
                        color: t.status === 'concluido' ? 'var(--green)' : t.status === 'andamento' ? 'var(--blue)' : 'var(--text-secondary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        {t.recurring_type && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        {t.title}
                      </div>
                    ))}
                    {day.tasks.length > 3 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{day.tasks.length - 3} mais</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        {selectedDay && (
          <div className="card fade-in" style={{ alignSelf: 'start', padding: '24px 24px', position: 'sticky', top: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {selectedDay.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  {selectedDay.tasks.length} tarefa{selectedDay.tasks.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} style={{
                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 20, padding: 4
              }}>×</button>
            </div>

            {selectedDay.tasks.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                Nenhuma tarefa neste dia
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedDay.tasks.map(t => (
                  <div key={t.id} style={{
                    padding: '14px 16px', background: 'var(--glass-2)', borderRadius: 12,
                    border: '1px solid var(--border)', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span className={`badge badge-${t.status}`} style={{ fontSize: 10 }}>{STATUS_LABELS[t.status]}</span>
                      <span className="badge badge-type" style={{ fontSize: 10 }}>{CONTENT_TYPE_LABELS[t.content_type]}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</p>
                      {t.recurring_type && (
                        <span style={{ fontSize: 9, color: 'var(--blue)', fontWeight: 500, background: 'var(--blue-bg)', padding: '2px 6px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {t.recurring_type === 'daily' ? 'Diaria' : t.recurring_type === 'weekly' ? 'Semanal' : 'Mensal'}
                        </span>
                      )}
                    </div>
                    {t.assignee && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>@</span> {t.assignee.name}
                        {t.assignee.team && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>· {TEAM_LABELS[t.assignee.team]}</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
