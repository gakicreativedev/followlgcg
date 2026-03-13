'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile, ContentType, CONTENT_TYPE_LABELS } from '@/types/database'

interface NewTaskFormProps {
  creatorId: string
  onSuccess?: () => void
}

export default function NewTaskForm({ creatorId, onSuccess }: NewTaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState<ContentType>('post_story')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('2')
  const [volunteers, setVolunteers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) setVolunteers(data)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('tasks').insert({
      title,
      description: description || null,
      content_type: contentType,
      assigned_to: assignedTo || null,
      created_by: creatorId,
      due_date: dueDate || null,
      priority: parseInt(priority),
      status: 'pendente',
    })

    setLoading(false)
    if (!error) {
      setTitle(''); setDescription(''); setAssignedTo(''); setDueDate('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Título da tarefa *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Arte para o culto de domingo" required />
      </div>

      <div className="form-group">
        <label>Descrição / Briefing</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Detalhes, referências, observações..."
          rows={3}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Tipo de conteúdo</label>
          <select value={contentType} onChange={e => setContentType(e.target.value as ContentType)}>
            {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Prioridade</label>
          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="1">Alta</option>
            <option value="2">Média</option>
            <option value="3">Baixa</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Atribuir a</label>
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">Sem atribuição</option>
            {volunteers.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Prazo</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar tarefa'}
        </button>
        {success && (
          <span style={{ fontSize: 13, color: 'var(--green)' }}>Tarefa criada!</span>
        )}
      </div>
    </form>
  )
}
