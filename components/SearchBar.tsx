'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentProfile } from '@/lib/auth'
import { Task, Profile, STATUS_LABELS } from '@/types/database'
import { useRouter } from 'next/navigation'

interface SearchResult {
  task: Task
  matchField: 'title' | 'description'
}

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(8)

      if (data) {
        setResults(data.map(t => ({
          task: t,
          matchField: t.title.toLowerCase().includes(query.toLowerCase()) ? 'title' : 'description'
        })))
      }
      setLoading(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
      <div style={{ position: 'relative' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="7" stroke="var(--text-muted)" strokeWidth="1.5"/>
          <path d="M20 20l-4-4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => query && setIsOpen(true)}
          placeholder="Buscar tarefas..."
          style={{
            width: '100%', padding: '10px 14px 10px 40px',
            background: 'var(--glass-2)', border: '1px solid var(--border)',
            borderRadius: 12, fontSize: 13, color: 'var(--text-primary)',
            outline: 'none', transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => (e.target as HTMLInputElement).style.borderColor = 'var(--border-strong)'}
          onMouseLeave={e => { if (document.activeElement !== e.target) (e.target as HTMLInputElement).style.borderColor = 'var(--border)' }}
        />
      </div>

      {isOpen && query.trim() && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
          borderRadius: 14, overflow: 'hidden', zIndex: 100,
          boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)',
        }}>
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Buscando...</span>
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum resultado para "{query}"</p>
            </div>
          )}
          {!loading && results.map(({ task }) => (
            <div
              key={task.id}
              onClick={() => { setIsOpen(false); setQuery('') }}
              style={{
                padding: '14px 18px', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className={`badge badge-${task.status}`} style={{ fontSize: 9 }}>{STATUS_LABELS[task.status]}</span>
                {task.due_date && new Date(task.due_date + 'T23:59:59') < new Date() && task.status !== 'concluido' && (
                  <span style={{ fontSize: 9, color: 'var(--red)', fontWeight: 600 }}>● Atrasada</span>
                )}
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{task.title}</p>
              {task.description && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
