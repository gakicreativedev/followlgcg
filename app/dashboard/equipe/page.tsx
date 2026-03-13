'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile, Task, ROLE_LABELS, CONTENT_TYPE_LABELS } from '@/types/database'

const AVATAR_COLORS = ['#7c6af7','#3ecf8e','#4a9eff','#f5a623','#e879a0','#f56565']

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function EquipePage() {
  const [team, setTeam] = useState<Profile[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [availMap, setAvailMap] = useState<Record<string, { days: string[]; tools: string[]; max_weekly_deliveries: number }>>({})
  const [capsMap, setCapsMap] = useState<Record<string, string[]>>({})

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: profiles } = await supabase.from('profiles').select('*').order('role')
      const { data: taskData } = await supabase.from('tasks').select('*')
      const { data: avail } = await supabase.from('availability').select('*')
      const { data: caps } = await supabase.from('user_capabilities').select('*')

      if (profiles) setTeam(profiles)
      if (taskData) setTasks(taskData)
      if (avail) {
        const m: Record<string, { days: string[]; tools: string[]; max_weekly_deliveries: number }> = {}
        avail.forEach((a: { user_id: string; days: string[]; tools: string[]; max_weekly_deliveries: number }) => { m[a.user_id] = a })
        setAvailMap(m)
      }
      if (caps) {
        const m: Record<string, string[]> = {}
        caps.forEach((c: { user_id: string; content_type: string }) => {
          if (!m[c.user_id]) m[c.user_id] = []
          m[c.user_id].push(c.content_type)
        })
        setCapsMap(m)
      }
    }
    load()
  }, [])

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Equipe</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{team.length} membros cadastrados</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {team.map((member, i) => {
          const memberTasks = tasks.filter(t => t.assigned_to === member.id)
          const done = memberTasks.filter(t => t.status === 'concluido').length
          const active = memberTasks.filter(t => ['andamento', 'revisao'].includes(t.status)).length
          const avail = availMap[member.id]
          const caps = capsMap[member.id] || []
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
          const pct = memberTasks.length > 0 ? Math.round((done / memberTasks.length) * 100) : 0

          return (
            <div key={member.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar" style={{ width: 42, height: 42, fontSize: 15, background: `${color}22`, color }}>
                  {initials(member.name)}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{member.name}</p>
                  <span className={`badge badge-${member.role}`}>{ROLE_LABELS[member.role]}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Total', val: memberTasks.length },
                  { label: 'Ativas', val: active, color: 'var(--blue)' },
                  { label: 'Feitas', val: done, color: 'var(--green)' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 600, color: m.color || 'var(--text-primary)' }}>{m.val}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.label}</p>
                  </div>
                ))}
              </div>

              {memberTasks.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Conclusão</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                  </div>
                </div>
              )}

              {avail && (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Disponibilidade</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {avail.days.map((d: string) => (
                      <span key={d} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {caps.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Capacidades</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {caps.map(c => (
                      <span key={c} className={`badge badge-${c}`} style={{ fontSize: 10 }}>{CONTENT_TYPE_LABELS[c as keyof typeof CONTENT_TYPE_LABELS]}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
