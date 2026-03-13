'use client'
import { Task, Checklist, ChecklistItem, Profile, TEAM_LABELS } from '@/types/database'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { getCurrentProfile } from '@/lib/auth'

interface TaskModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function TaskModal({ task, isOpen, onClose, onUpdate }: TaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [checklists, setChecklists] = useState<(Checklist & { items: ChecklistItem[] })[]>([])
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [newItemContents, setNewItemContents] = useState<Record<string, string>>({})
  
  const [gdriveLink, setGdriveLink] = useState(task.gdrive_link || '')
  const [imageUrl, setImageUrl] = useState(task.image_url || '')
  const [uploadingImage, setUploadingImage] = useState(false)

  const [teamMembers, setTeamMembers] = useState<Profile[]>([])
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '')
  const [canAssign, setCanAssign] = useState(false)

  // Extrair ID do GDrive se for link longo
  const getGdriveId = (link: string) => {
    if (!link) return null
    const match = link.match(/[-\w]{25,}/)
    return match ? match[0] : null
  }

  const gdriveId = getGdriveId(gdriveLink)

  useEffect(() => {
    if (isOpen) {
      loadChecklists()
      loadTeamMembers()
    }
  }, [isOpen, task.id])

  async function loadTeamMembers() {
    const supabase = createClient()
    const currentProfile = await getCurrentProfile()
    if (!currentProfile) return
    // Admin, pastor, lider e vice_lider podem atribuir
    if (['admin', 'pastor', 'lider', 'vice_lider'].includes(currentProfile.role)) {
      setCanAssign(true)
    }
    let query = supabase.from('profiles').select('*').eq('status', 'ativo').order('name')
    // Se a tarefa tiver equipe, filtrar apenas membros dessa equipe
    if (task.team_target) {
      query = query.eq('team', task.team_target)
    }
    const { data } = await query
    if (data) setTeamMembers(data)
  }

  async function handleAssign(userId: string) {
    setAssignedTo(userId)
    const supabase = createClient()
    await supabase.from('tasks').update({ assigned_to: userId || null }).eq('id', task.id)
    onUpdate()
  }

  async function loadChecklists() {
    const supabase = createClient()
    const { data: lists } = await supabase.from('checklists').select('*').eq('task_id', task.id).order('created_at', { ascending: true })
    if (!lists) return

    const { data: items } = await supabase.from('checklist_items').select('*').in('checklist_id', lists.map(l => l.id)).order('position', { ascending: true })
    
    const combined = lists.map(l => ({
      ...l,
      items: (items || []).filter(i => i.checklist_id === l.id)
    }))

    setChecklists(combined)
  }

  async function handleCreateChecklist(e: React.FormEvent) {
    e.preventDefault()
    if (!newChecklistTitle.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('checklists').insert({
      task_id: task.id,
      title: newChecklistTitle.trim()
    }).select().single()

    if (data) {
      setChecklists([...checklists, { ...data, items: [] }])
      setNewChecklistTitle('')
    }
  }

  async function handleAddChecklistItem(checklistId: string, e: React.FormEvent) {
    e.preventDefault()
    const content = newItemContents[checklistId]
    if (!content?.trim()) return

    const supabase = createClient()
    const targetList = checklists.find(c => c.id === checklistId)
    const maxPos = targetList?.items.length ? Math.max(...targetList.items.map(i => i.position)) : -1

    const { data } = await supabase.from('checklist_items').insert({
      checklist_id: checklistId,
      content: content.trim(),
      position: maxPos + 1
    }).select().single()

    if (data) {
      setChecklists(checklists.map(c => 
        c.id === checklistId ? { ...c, items: [...c.items, data] } : c
      ))
      setNewItemContents({ ...newItemContents, [checklistId]: '' })
    }
  }

  async function toggleChecklistItem(item: ChecklistItem) {
    const supabase = createClient()
    const newVal = !item.is_completed
    await supabase.from('checklist_items').update({ is_completed: newVal }).eq('id', item.id)
    
    setChecklists(checklists.map(c => 
      c.id === item.checklist_id 
        ? { ...c, items: c.items.map(i => i.id === item.id ? { ...i, is_completed: newVal } : i) }
        : c
    ))
  }

  async function handleDeleteChecklist(id: string) {
    if(!confirm("Excluir checkbox inteiro?")) return
    const supabase = createClient()
    await supabase.from('checklists').delete().eq('id', id)
    setChecklists(checklists.filter(c => c.id !== id))
  }

  async function saveGdriveLink() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tasks').update({ gdrive_link: gdriveLink }).eq('id', task.id)
    setLoading(false)
    onUpdate()
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    
    // Upload for a bucket called 'task_attachments'. Note: the DB/RLS needs to be setup for this.
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${task.id}-${Math.random()}.${fileExt}`
    
    const { data, error } = await supabase.storage.from('task_attachments').upload(fileName, file)
    
    if (error) {
       console.error(error)
       // Fallback: se não tiver o storage configurado, avisa
       alert("Erro ao subir imagem. O Bucket 'task_attachments' foi criado e deixado como público?")
       setUploadingImage(false)
       return
    }

    const { data: { publicUrl } } = supabase.storage.from('task_attachments').getPublicUrl(fileName)
    await supabase.from('tasks').update({ image_url: publicUrl }).eq('id', task.id)
    setImageUrl(publicUrl)
    setUploadingImage(false)
    onUpdate()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      padding: 24
    }}>
      <div className="card fade-in" style={{
        width: '100%', maxWidth: 840, maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--bg-default)', border: '1px solid var(--border-highlight)', 
        padding: '32px 40px', position: 'relative'
      }}>
        {/* Close Button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 20, right: 24, fontSize: 24, background: 'transparent',
          border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
        }}>×</button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{task.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Na lista <span style={{ textDecoration: 'underline' }}>{task.status}</span></p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
          {/* Main Area (Left) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* Descrição */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                Descrição
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--glass-1)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                {task.description || "Nenhuma descrição detalhada fornecida."}
              </p>
            </div>

            {/* Checklists */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Checklists</h3>
              </div>

              {checklists.map(c => {
                const completedCount = c.items.filter(i => i.is_completed).length
                const pct = c.items.length > 0 ? Math.round((completedCount / c.items.length) * 100) : 0

                return (
                  <div key={c.id} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</h4>
                      <button onClick={() => handleDeleteChecklist(c.id)} style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>Excluir</button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 30 }}>{pct}%</span>
                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--blue)', transition: 'width 0.3s' }} />
                      </div>
                    </div>

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {c.items.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 8px', borderRadius: 6, transition: 'background 0.2s', background: item.is_completed ? 'var(--glass-1)' : 'transparent' }}>
                          <input 
                            type="checkbox" 
                            checked={item.is_completed} 
                            onChange={() => toggleChecklistItem(item)}
                            style={{ marginTop: 3, cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 13, color: item.is_completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.is_completed ? 'line-through' : 'none', flex: 1 }}>{item.content}</span>
                        </div>
                      ))}
                    </div>

                    {/* Add Item form */}
                    <form onSubmit={(e) => handleAddChecklistItem(c.id, e)} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input 
                        type="text" 
                        placeholder="Adicionar um item..." 
                        className="input-field" 
                        style={{ flex: 1, padding: '8px 12px', fontSize: 13, background: 'transparent' }}
                        value={newItemContents[c.id] || ''}
                        onChange={e => setNewItemContents({ ...newItemContents, [c.id]: e.target.value })}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>Adicionar</button>
                    </form>
                  </div>
                )
              })}

              {/* Add Checklist form */}
              <form onSubmit={handleCreateChecklist} style={{ marginTop: 16, background: 'var(--glass-1)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Nova Checklist</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="text" 
                    placeholder="Ex: Tarefas de Edição" 
                    className="input-field" 
                    style={{ flex: 1, background: 'var(--bg-default)' }}
                    value={newChecklistTitle}
                    onChange={e => setNewChecklistTitle(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">Criar</button>
                </div>
              </form>
            </div>

            {/* Imagem (Anexo) */}
            <div>
               <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Anexo de Imagem</h3>
               {imageUrl ? (
                 <div style={{ position: 'relative', display: 'inline-block' }}>
                   <img src={imageUrl} alt="Anexo" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid var(--border)' }} />
                   <button 
                     onClick={async () => {
                       if(!confirm("Remover imagem?")) return
                       await createClient().from('tasks').update({ image_url: null }).eq('id', task.id)
                       setImageUrl('')
                       onUpdate()
                     }}
                     className="btn" 
                     style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '4px 8px', fontSize: 11 }}
                   >Remover</button>
                 </div>
               ) : (
                 <div style={{ border: '1px dashed var(--border-highlight)', borderRadius: 8, padding: 24, textAlign: 'center', background: 'var(--glass-1)' }}>
                   <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Nenhuma imagem anexada. Clique para enviar do seu computador.</p>
                   {uploadingImage ? (
                     <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Enviando...</span>
                   ) : (
                     <label className="btn" style={{ cursor: 'pointer', display: 'inline-block' }}>
                       Escolher e Subir Imagem
                       <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                     </label>
                   )}
                 </div>
               )}
            </div>

          </div>

          {/* Sidebar (Right) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Google Drive Embed */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Google Drive Link</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Cole a URL do Drive..." 
                  value={gdriveLink}
                  onChange={e => setGdriveLink(e.target.value)}
                  style={{ flex: 1, fontSize: 12 }}
                />
                <button className="btn" onClick={saveGdriveLink} disabled={loading} style={{ padding: '0 12px', fontSize: 11 }}>Salvar</button>
              </div>

              {gdriveId && (
                <div style={{ width: '100%', height: 260, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--glass-1)' }}>
                  <iframe 
                    src={`https://drive.google.com/embeddedfolderview?id=${gdriveId}#grid`} 
                    width="100%" 
                    height="100%" 
                    frameBorder="0"
                    title="Google Drive Preview"
                  ></iframe>
                </div>
              )}
            </div>

            {/* Atribuições / Resumo */}
            <div style={{ background: 'var(--glass-2)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Atribuído a</p>
              {canAssign ? (
                <select
                  value={assignedTo}
                  onChange={e => handleAssign(e.target.value)}
                  style={{
                    width: '100%', fontSize: 13, padding: '8px 12px', borderRadius: 8,
                    background: 'var(--glass-1)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', cursor: 'pointer', marginBottom: 16
                  }}
                >
                  <option value="">Sem atribuição</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.team ? ` — ${TEAM_LABELS[m.team]}` : ''}</option>
                  ))}
                </select>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 16 }}>{task.assignee?.name || 'Não atribuído'}</p>
              )}
              {task.team_target && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, marginTop: -8 }}>Mostrando apenas membros de <span style={{ color: 'var(--text-secondary)' }}>{TEAM_LABELS[task.team_target]}</span></p>
              )}

              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Criado por</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{task.creator?.name || 'Desconhecido'}</p>

              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Data Opcional</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
