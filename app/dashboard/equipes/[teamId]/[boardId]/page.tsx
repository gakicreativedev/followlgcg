'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, Task, KanbanBoard, KanbanList } from '@/types/database'
import TaskCard from '@/components/TaskCard'
import { useRouter } from 'next/navigation'

export default function BoardPage({ params }: { params: { teamId: string, boardId: string } }) {
  const router = useRouter()
  const { teamId, boardId } = params
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [board, setBoard] = useState<KanbanBoard | null>(null)
  const [lists, setLists] = useState<KanbanList[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  // Creation states
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')

  // Drag & Drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverListId, setDragOverListId] = useState<string | null>(null)

  async function load() {
    const prof = await getCurrentProfile()
    if (!prof || (prof.role !== 'admin' && prof.role !== 'pastor' && prof.role !== 'lider')) {
      router.push('/dashboard')
      return
    }
    setProfile(prof)

    const supabase = createClient()
    
    const { data: bData } = await supabase.from('kanban_boards').select('*').eq('id', boardId).single()
    if (!bData) {
      setLoading(false)
      return
    }
    setBoard(bData)

    const { data: lData } = await supabase.from('kanban_lists').select('*').eq('board_id', boardId).order('position', { ascending: true })
    if (lData) setLists(lData)

    const { data: tData } = await supabase.from('tasks').select('*').eq('board_id', boardId).order('created_at', { ascending: false })
    const { data: allProfiles } = await supabase.from('profiles').select('*')

    if (tData && allProfiles) {
      setTasks(tData.map((t: Task) => ({
        ...t,
        assignee: allProfiles.find(p => p.id === t.assigned_to),
        creator: allProfiles.find(p => p.id === t.created_by),
      })))
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [boardId, refresh])

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault()
    if (!newListTitle.trim() || !board) return

    const supabase = createClient()
    const maxPosition = lists.length > 0 ? Math.max(...lists.map(l => l.position)) : -1
    
    const { data, error } = await supabase
      .from('kanban_lists')
      .insert({
        title: newListTitle.trim(),
        board_id: board.id,
        position: maxPosition + 1
      })
      .select()
      .single()

    if (!error && data) {
      setLists([...lists, data])
      setIsCreatingList(false)
      setNewListTitle('')
    }
  }

  async function handleDeleteList(listId: string) {
    if (!confirm('Deseja excluir esta lista e todas as suas tarefas ficarão sem lista associada?')) return
    const supabase = createClient()
    await supabase.from('kanban_lists').delete().eq('id', listId)
    setLists(lists.filter(l => l.id !== listId))
  }

  // Drag & Drop handlers
  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    // Make the dragged element semi-transparent
    const el = e.currentTarget as HTMLElement
    setTimeout(() => { el.style.opacity = '0.4' }, 0)
  }

  function handleDragEnd(e: React.DragEvent) {
    const el = e.currentTarget as HTMLElement
    el.style.opacity = '1'
    setDraggedTaskId(null)
    setDragOverListId(null)
  }

  function handleDragOver(e: React.DragEvent, listId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverListId(listId)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if leaving the list container
    const related = e.relatedTarget as HTMLElement
    if (!e.currentTarget.contains(related)) {
      setDragOverListId(null)
    }
  }

  async function handleDrop(e: React.DragEvent, targetListId: string) {
    e.preventDefault()
    setDragOverListId(null)
    if (!draggedTaskId) return

    const task = tasks.find(t => t.id === draggedTaskId)
    if (!task || task.list_id === targetListId) {
      setDraggedTaskId(null)
      return
    }

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === draggedTaskId ? { ...t, list_id: targetListId } : t
    ))

    // Persist to DB
    const supabase = createClient()
    await supabase.from('tasks').update({ list_id: targetListId }).eq('id', draggedTaskId)
    
    setDraggedTaskId(null)
  }

  if (loading) return null

  if (!board) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: 48 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--red)' }}>Quadro não encontrado</h1>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => router.push(`/dashboard/equipes/${teamId}`)}>Voltar</button>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header do Quadro */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <button onClick={() => router.push(`/dashboard/equipes/${teamId}`)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Voltar para {board.team_target}
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{board.title}</h1>
        </div>
        
        <button className="btn btn-primary" onClick={() => router.push(`/dashboard/nova-tarefa?team=${teamId}&board=${boardId}`)}>
          Nova Tarefa neste Quadro
        </button>
      </div>

      {/* Drag hint */}
      {draggedTaskId && (
        <div style={{
          textAlign: 'center', padding: '8px 16px', marginBottom: 12,
          background: 'var(--glass-2)', borderRadius: 8, border: '1px solid var(--border-strong)',
          fontSize: 12, color: 'var(--text-secondary)',
          animation: 'fadeIn 0.2s ease',
        }}>
          🎯 Arraste para outra lista para mover a tarefa
        </div>
      )}

      {/* Kanban Board Horizontal Scroll */}
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', flex: 1, paddingBottom: 16, alignItems: 'flex-start' }}>
        
        {lists.map(list => {
          const listTasks = tasks.filter(t => t.list_id === list.id)
          const isOver = dragOverListId === list.id

          return (
            <div
              key={list.id}
              onDragOver={e => handleDragOver(e, list.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, list.id)}
              style={{
                background: isOver ? 'var(--glass-3)' : 'var(--glass-1)',
                border: isOver ? '1.5px solid var(--border-highlight)' : '1px solid var(--border)',
                borderRadius: 14,
                minWidth: 320,
                width: 320,
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
                transform: isOver ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              {/* List Header */}
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-transparent)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {list.title} <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 400, marginLeft: 6 }}>{listTasks.length}</span>
                </h3>
                <button 
                  onClick={() => handleDeleteList(list.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5 }}
                >
                  ×
                </button>
              </div>

              {/* Tasks Container */}
              <div style={{ padding: 12, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 80 }}>
                {listTasks.map(t => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={e => handleDragStart(e, t.id)}
                    onDragEnd={handleDragEnd}
                    style={{ cursor: 'grab' }}
                  >
                    <TaskCard task={t} canEdit={true} onUpdate={() => setRefresh(r => r + 1)} />
                  </div>
                ))}
                
                {listTasks.length === 0 && (
                  <div style={{
                    padding: '24px 0', textAlign: 'center',
                    border: isOver ? '2px dashed var(--border-highlight)' : '2px dashed transparent',
                    borderRadius: 12, transition: 'all 0.2s',
                  }}>
                     <p style={{ fontSize: 12, color: isOver ? 'var(--text-secondary)' : 'var(--gray-600)' }}>
                       {isOver ? 'Solte aqui' : 'Sem tarefas'}
                     </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Add New List Button/Form */}
        <div style={{ minWidth: 280 }}>
          {!isCreatingList ? (
            <button 
              onClick={() => setIsCreatingList(true)}
              style={{ width: '100%', background: 'var(--glass-2)', border: '1px dashed var(--border)', borderRadius: 12, padding: 12, color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', fontSize: 13, transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              + Adicionar outra lista
            </button>
          ) : (
            <div className="card" style={{ padding: 12, border: '1px solid var(--border-highlight)' }}>
              <form onSubmit={handleCreateList}>
                <input
                  autoFocus
                  type="text"
                  className="input-field"
                  placeholder="Título da lista..."
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  style={{ marginBottom: 8, width: '100%' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: 6, fontSize: 12 }}>Adicionar</button>
                  <button type="button" className="btn" style={{ padding: 6, fontSize: 12 }} onClick={() => setIsCreatingList(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
