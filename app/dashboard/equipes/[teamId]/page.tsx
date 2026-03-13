'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Profile, TeamSector, TEAM_LABELS, KanbanBoard } from '@/types/database'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function TeamBoardsPage({ params }: { params: { teamId: string } }) {
  const router = useRouter()
  const { teamId } = params
  const isValidTeam = Object.keys(TEAM_LABELS).includes(teamId)
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teamMembers, setTeamMembers] = useState<Profile[]>([])
  const [boards, setBoards] = useState<KanbanBoard[]>([])
  const [loading, setLoading] = useState(true)
  
  // States para criação de novo Quadro
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [newBoardTitle, setNewBoardTitle] = useState('')

  async function load() {
    if (!isValidTeam) {
      setLoading(false)
      return
    }

    const prof = await getCurrentProfile()
    if (!prof || (prof.role !== 'admin' && prof.role !== 'pastor')) {
      router.push('/dashboard')
      return
    }
    setProfile(prof)

    const supabase = createClient()
    
    // Carregar membros do time
    const { data: members } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'ativo')
      .eq('team', teamId)
    if (members) setTeamMembers(members)

    // Carregar Quadros (Boards) deste time
    const { data: teamBoards } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('team_target', teamId)
      .order('created_at', { ascending: false })
    
    if (teamBoards) setBoards(teamBoards)
    
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [teamId, isValidTeam, router])

  async function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault()
    if (!newBoardTitle.trim()) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('kanban_boards')
      .insert({
        title: newBoardTitle.trim(),
        team_target: teamId
      })
      .select()
      .single()

    if (!error && data) {
      setBoards([data, ...boards])
      setIsCreatingBoard(false)
      setNewBoardTitle('')
      // Trazendo as 3 listas padrão opcionalmente? Faremos depois.
    } else {
      console.error(error)
      alert('Erro ao criar quadro.')
    }
  }

  async function handleDeleteBoard(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja apagar este quadro e todas as suas listas?')) return
    
    const supabase = createClient()
    await supabase.from('kanban_boards').delete().eq('id', id)
    setBoards(boards.filter(b => b.id !== id))
  }

  if (loading) return null

  if (!isValidTeam) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: 48 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--red)' }}>Equipe não encontrada</h1>
        <button className="btn" style={{ marginTop: 16 }} onClick={() => router.push('/dashboard')}>Voltar ao Hub</button>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Voltar para Nossas Equipes
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{TEAM_LABELS[teamId as TeamSector]} - Quadros</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Gerencie os projetos e painéis da equipe
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}>
        
        {/* Quadros Centrais */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <p className="section-title">Todos os Quadros</p>
             <button className="btn btn-primary" onClick={() => setIsCreatingBoard(true)} style={{ padding: '6px 14px', fontSize: 12 }}>+ Novo Quadro</button>
          </div>

          {isCreatingBoard && (
            <div className="card" style={{ padding: 16, marginBottom: 8, border: '1px solid var(--border-highlight)' }}>
               <form onSubmit={handleCreateBoard} style={{ display: 'flex', gap: 10 }}>
                 <input 
                   type="text" 
                   className="input-field" 
                   placeholder="Nome do Quadro (ex: Lançamento Imersão)" 
                   value={newBoardTitle}
                   onChange={e => setNewBoardTitle(e.target.value)}
                   autoFocus
                   style={{ flex: 1 }}
                 />
                 <button type="submit" className="btn btn-primary">Salvar</button>
                 <button type="button" className="btn" onClick={() => setIsCreatingBoard(false)}>Cancelar</button>
               </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {boards.map(b => (
              <Link href={`/dashboard/equipes/${teamId}/${b.id}`} key={b.id} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--glass-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '20px 16px',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                className="board-card"
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-highlight)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, paddingRight: 24 }}>{b.title}</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Criado em {new Date(b.created_at).toLocaleDateString('pt-BR')}
                  </p>

                  <button 
                    onClick={(e) => handleDeleteBoard(b.id, e)}
                    style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                    title="Excluir Quadro"
                  >
                    ×
                  </button>
                </div>
              </Link>
            ))}
            {boards.length === 0 && !isCreatingBoard && (
              <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', background: 'var(--glass-1)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nenhum quadro criado ainda.</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Crie um quadro para começar a organizar as tarefas em listas customizadas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Membros */}
        <div>
          <p className="section-title">Membros da Equipe</p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {teamMembers.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < teamMembers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: 'var(--glass-2)', color: 'var(--text-primary)' }}>
                  {initials(m.name)}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{m.username ?? m.email.split('@')[0]}</p>
                </div>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Equipe vazia</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
