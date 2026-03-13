'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile, ContentType, CONTENT_TYPE_LABELS } from '@/types/database'

const DAYS = ['seg','ter','qua','qui','sex','sab','dom']
const DAY_LABELS: Record<string, string> = { seg:'Seg',ter:'Ter',qua:'Qua',qui:'Qui',sex:'Sex',sab:'Sáb',dom:'Dom' }
const TOOLS = ['Canva','CapCut','Premiere','After Effects','Photoshop','Illustrator']

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [maxDeliveries, setMaxDeliveries] = useState('2')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [selectedCaps, setSelectedCaps] = useState<ContentType[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('email', user.email).single()
      if (!prof) return
      setProfile(prof)

      const { data: avail } = await supabase.from('availability').select('*').eq('user_id', prof.id).single()
      if (avail) {
        setSelectedDays(avail.days || [])
        setMaxDeliveries(String(avail.max_weekly_deliveries))
        setSelectedTools(avail.tools || [])
      }

      const { data: caps } = await supabase.from('user_capabilities').select('content_type').eq('user_id', prof.id)
      if (caps) setSelectedCaps(caps.map((c: { content_type: ContentType }) => c.content_type))
    }
    load()
  }, [])

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()

    await supabase.from('availability').upsert({
      user_id: profile.id,
      days: selectedDays,
      max_weekly_deliveries: parseInt(maxDeliveries),
      tools: selectedTools,
    }, { onConflict: 'user_id' })

    await supabase.from('user_capabilities').delete().eq('user_id', profile.id)
    if (selectedCaps.length > 0) {
      await supabase.from('user_capabilities').insert(
        selectedCaps.map(c => ({ user_id: profile.id, content_type: c }))
      )
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!profile) return null

  const ChipBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--gold)' : 'var(--border-strong)'}`,
        background: active ? 'var(--accent-light)' : 'var(--bg-elevated)',
        color: active ? 'var(--gold)' : 'var(--text-secondary)',
        transition: 'all 0.15s',
        fontFamily: 'var(--font-main)',
      }}
    >{children}</button>
  )

  return (
    <div className="fade-in" style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Meu perfil</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Configure sua disponibilidade e capacidades</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{profile.name}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{profile.email}</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Disponibilidade semanal</p>

        <div className="form-group">
          <label>Dias disponíveis</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {DAYS.map(d => (
              <ChipBtn key={d} active={selectedDays.includes(d)} onClick={() => setSelectedDays(toggle(selectedDays, d))}>
                {DAY_LABELS[d]}
              </ChipBtn>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Máximo de entregas por semana</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {['1','2','3','4+'].map(v => (
              <ChipBtn key={v} active={maxDeliveries === v} onClick={() => setMaxDeliveries(v)}>{v}</ChipBtn>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>O que consigo produzir</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.entries(CONTENT_TYPE_LABELS) as [ContentType, string][]).map(([v, l]) => (
            <ChipBtn key={v} active={selectedCaps.includes(v)} onClick={() => setSelectedCaps(toggle(selectedCaps, v))}>{l}</ChipBtn>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>Ferramentas que uso</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TOOLS.map(t => (
            <ChipBtn key={t} active={selectedTools.includes(t.toLowerCase())} onClick={() => setSelectedTools(toggle(selectedTools, t.toLowerCase()))}>{t}</ChipBtn>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
        {saved && <span style={{ fontSize: 13, color: 'var(--green)' }}>Salvo com sucesso!</span>}
      </div>
    </div>
  )
}
