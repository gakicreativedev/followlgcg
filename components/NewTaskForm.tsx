'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile, ContentType, CONTENT_TYPE_LABELS, TeamSector, TEAM_LABELS, KanbanList, KanbanBoard } from '@/types/database'
import { useSearchParams } from 'next/navigation'

interface NewTaskFormProps {
  creatorId: string
  onSuccess?: () => void
}

export default function NewTaskForm({ creatorId, onSuccess }: NewTaskFormProps) {
  const searchParams = useSearchParams()
  const defaultTeam = searchParams.get('team') as TeamSector | null
  const defaultBoard = searchParams.get('board') as string | null

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState<ContentType>('post_story')
  
  const [teamTarget, setTeamTarget] = useState<TeamSector | ''>(defaultTeam || '')
  const [boardId, setBoardId] = useState<string>(defaultBoard || '')
  const [listId, setListId] = useState<string>('')
  
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('2')
  
  const [volunteers, setVolunteers] = useState<Profile[]>([])
  const [boards, setBoards] = useState<KanbanBoard[]>([])
  const [lists, setLists] = useState<KanbanList[]>([])
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) setVolunteers(data)
    })
  }, [])

  // Carrega boards quando altera equipe
  useEffect(() => {
    if (!teamTarget) {
      setBoards([])
      setBoardId('')
      return
    }
    const supabase = createClient()
    supabase.from('kanban_boards').select('*').eq('team_target', teamTarget).then(({ data }) => {
      if (data) setBoards(data)
    })
  }, [teamTarget])

  // Carrega listas quando altera board
  useEffect(() => {
    if (!boardId) {
      setLists([])
      setListId('')
      return
    }
    const supabase = createClient()
    supabase.from('kanban_lists').select('*').eq('board_id', boardId).order('position').then(({ data }) => {
      if (data) {
        setLists(data)
        if (data.length > 0) setListId(data[0].id)
      }
    })
  }, [boardId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('tasks').insert({
      title,
      description: description || null,
      content_type: contentType,
      team_target: teamTarget || null,
      board_id: boardId || null,
      list_id: listId || null,
      assigned_to: assignedTo || null,
      created_by: creatorId,
      due_date: dueDate || null,
      priority: parseInt(priority),
      status: 'pendente',
    })

    setLoading(false)
    if (!error) {
      setTitle(''); setDescription(''); setAssignedTo(''); setDueDate(''); setTeamTarget('');
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Equipe Destino</label>
          <select value={teamTarget} onChange={e => { setTeamTarget(e.target.value as TeamSector); setAssignedTo(''); setBoardId(''); }}>
            <option value="">Nenhuma equipe específica</option>
            {Object.entries(TEAM_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Quadro (Board)</label>
          <select value={boardId} onChange={e => setBoardId(e.target.value)} disabled={!teamTarget}>
            <option value="">Sem quadro específico</option>
            {boards.map(b => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Coluna inicial</label>
          <select value={listId} onChange={e => setListId(e.target.value)} disabled={!boardId || lists.length === 0}>
            {lists.length === 0 && <option value="">Crie uma lista no painel</option>}
            {lists.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Atribuir a um voluntário (opcional)</label>
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">Sem atribuição direta</option>
            {volunteers
              .filter(v => !teamTarget || v.team === teamTarget)
              .map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Prazo esperado</label>
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
