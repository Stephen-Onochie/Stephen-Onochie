'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchTodos, setTodoCompleted, createTodo } from '@/lib/todo/supabase'
import { parseTodoInput } from '@/lib/todo/parse'
import type { Todo } from '@/types/todo'
import { Check, Plus } from 'lucide-react'
import Link from 'next/link'

export default function TodoWidget() {
  const supabase = useMemo(() => createClient(), [])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')

  async function load() {
    try {
      const all = await fetchTodos(supabase)
      setTodos(all)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const outstanding = todos.filter(t => !t.completed)
  const remaining = outstanding.length
  const total = todos.length
  const pct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0
  const circumference = 2 * Math.PI * 15

  async function toggle(todo: Todo) {
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t))
    await setTodoCompleted(supabase, todo.id, !todo.completed)
  }

  async function addTask() {
    const title = draft.trim()
    if (!title) return
    const parsed = parseTodoInput(title)
    setDraft('')
    const created = await createTodo(supabase, { title: parsed.title, due_at: parsed.dueAt ?? undefined })
    setTodos(prev => [...prev, created])
  }

  return (
    <div
      className="flex flex-col rounded-[18px] p-6"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)', flex: 1 }}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase mb-1" style={{ color: 'var(--iven-accent)' }}>TODO</div>
          <div className="font-playfair font-bold text-xl" style={{ color: 'var(--iven-text)' }}>Outstanding</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>{remaining} LEFT</span>
          <svg width={38} height={38} viewBox="0 0 38 38">
            <circle cx={19} cy={19} r={15} fill="none" stroke="var(--iven-grid)" strokeWidth={4} />
            <circle
              cx={19} cy={19} r={15} fill="none"
              stroke="var(--iven-accent)" strokeWidth={4}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset .5s ease' }}
            />
          </svg>
        </div>
      </div>

      <div className="flex flex-col flex-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg mb-1 animate-pulse" style={{ background: 'var(--iven-grid)', opacity: 0.3 }} />
          ))
        ) : outstanding.length === 0 ? (
          <div className="flex-1 flex items-center justify-center font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
            ALL CAUGHT UP
          </div>
        ) : (
          outstanding.slice(0, 5).map(task => (
            <button
              key={task.id}
              onClick={() => toggle(task)}
              className="flex items-center gap-3 px-[6px] py-[13px] text-left transition-colors"
              style={{ borderBottom: '1px solid var(--iven-grid)' }}
            >
              <div
                className="flex items-center justify-center rounded-[6px] flex-shrink-0 transition-colors"
                style={{
                  width: 20, height: 20,
                  border: task.completed ? '1px solid var(--iven-accent)' : '1px solid var(--iven-grid)',
                  background: task.completed ? 'var(--iven-accent)' : 'transparent',
                }}
              >
                {task.completed && <Check size={12} strokeWidth={3.2} style={{ color: 'var(--iven-text)' }} />}
              </div>
              <span
                className="text-sm flex-1"
                style={{
                  color: task.completed ? 'var(--iven-muted)' : 'var(--iven-text)',
                  textDecoration: task.completed ? 'line-through' : 'none',
                }}
              >
                {task.title}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 pt-3 mt-1">
        <Plus size={16} style={{ color: 'var(--iven-muted)', flexShrink: 0 }} />
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-inter"
          style={{ border: 'none', color: 'var(--iven-text)' }}
        />
        <button
          onClick={addTask}
          className="font-mono text-[10px] tracking-[1.5px] font-semibold rounded-lg px-3 py-2 transition-colors"
          style={{ background: 'var(--iven-accent)', color: '#2C1F0E', border: 'none', cursor: 'pointer' }}
        >
          ADD
        </button>
      </div>

      <Link
        href="/apps/todo"
        className="font-mono text-[9px] tracking-[1.5px] uppercase mt-3 self-end transition-colors"
        style={{ color: 'var(--iven-muted)' }}
      >
        VIEW ALL →
      </Link>
    </div>
  )
}
