'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types/database'
import NewTaskForm from '@/components/NewTaskForm'

export default function NovaTarefaPage() {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('email', user.email).single()
      if (data) setProfile(data)
    }
    load()
  }, [])

  if (!profile) return null

  return (
    <div className="fade-in" style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Nova demanda</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Crie e atribua uma tarefa para a equipe</p>
      </div>
      <div className="card">
        <NewTaskForm creatorId={profile.id} />
      </div>
    </div>
  )
}
