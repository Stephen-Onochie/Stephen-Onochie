'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createList,
  createTodo,
  deleteList,
  deleteTodo,
  fetchLists,
  fetchTodos,
  nextListColor,
  setTodoCompleted,
  updateTodo,
} from '@/lib/todo/supabase'
import { formatDue, isDueToday, isOverdue, parseTodoInput } from '@/lib/todo/parse'
import {
  scheduleDueReminders,
  getNotificationSupport,
  requestNotificationPermission,
} from '@/lib/todo/notifications'
import IvenModule from '@/components/iven/IvenModule'
import type { Todo, TodoList, ViewId } from '@/types/todo'
import { Check, Plus, Inbox, CalendarDays, Trash2 } from 'lucide-react'

const VIEWS: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  { id: 'today', label: 'TODAY', icon: <CalendarDays size={13} /> },
  { id: 'inbox', label: 'INBOX', icon: <Inbox size={13} /> },
]

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function metaFor(todo: Todo) {
  if (todo.due_at) return formatDue(todo.due_at)
  const d = new Date(todo.created_at)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export default function TodoPage() {
  const supabase = useMemo(() => createClient(), [])
  const [lists, setLists] = useState<TodoList[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [view, setView] = useState<ViewId>('today')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [notifyState, setNotifyState] = useState('default')

  const load = useCallback(async () => {
    try {
      const [l, t] = await Promise.all([fetchLists(supabase), fetchTodos(supabase)])
      setLists(l)
      setTodos(t)
      setError(null)
    } catch {
      setError('Failed to load tasks. Is Supabase configured?')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])
  useEffect(() => { setNotifyState(getNotificationSupport()) }, [])
  useEffect(() => scheduleDueReminders(todos), [todos])

  const visibleTodos = useMemo(() => {
    if (view === 'today') return todos.filter(t => !t.completed && !!t.due_at && isDueToday(t.due_at))
    if (view === 'inbox') return todos.filter(t => !t.completed && !t.list_id)
    return todos.filter(t => !t.completed && t.list_id === view)
  }, [todos, view])

  const done = todos.filter(t => t.completed && (
    view === 'today' ? (!!t.due_at && isDueToday(t.due_at)) : view === 'inbox' ? !t.list_id : t.list_id === view
  ))

  async function toggle(todo: Todo) {
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t))
    await setTodoCompleted(supabase, todo.id, !todo.completed)
  }

  async function addTask() {
    const input = draft.trim()
    if (!input) return
    const parsed = parseTodoInput(input)
    setDraft('')
    const created = await createTodo(supabase, {
      title: parsed.title,
      due_at: parsed.dueAt ?? (view === 'today' ? new Date().toISOString() : undefined),
      list_id: typeof view === 'string' && view !== 'today' && view !== 'inbox' ? view : undefined,
    })
    setTodos(prev => [created, ...prev])
  }

  async function remove(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
    await deleteTodo(supabase, id)
  }

  const tasksDone = done.length
  const tasksTotal = visibleTodos.length + done.length
  const pct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0
  const c = 2 * Math.PI * 15

  return (
    <IvenModule
      index={3}
      title="Todo"
      right={
        <span className="font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
          {tasksDone} / {tasksTotal} DONE
        </span>
      }
    >
      {/* View switcher */}
      <div className="flex gap-1 mb-6">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className="flex items-center gap-2 font-mono text-[10px] tracking-[1.5px] px-3 py-[6px] rounded-lg transition-colors"
            style={{
              background: view === v.id ? 'var(--iven-accent)' : 'transparent',
              color: view === v.id ? '#2C1F0E' : 'var(--iven-muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            {v.icon}{v.label}
          </button>
        ))}
        {lists.map(l => (
          <button
            key={l.id}
            onClick={() => setView(l.id)}
            className="flex items-center gap-2 font-mono text-[10px] tracking-[1.5px] px-3 py-[6px] rounded-lg transition-colors"
            style={{
              background: view === l.id ? 'var(--iven-accent)' : 'transparent',
              color: view === l.id ? '#2C1F0E' : 'var(--iven-muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            {l.emoji} {l.name.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="max-w-3xl">
        <div className="rounded-[18px] pb-2" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mx-6 my-3 h-12 rounded-lg animate-pulse" style={{ background: 'var(--iven-grid)', opacity: 0.3 }} />
            ))
          ) : error ? (
            <div className="text-center py-12 font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>{error}</div>
          ) : visibleTodos.length === 0 && done.length === 0 ? (
            <div className="text-center py-12 font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
              NO TASKS
            </div>
          ) : (
            <>
              {visibleTodos.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer group"
                  style={{ borderBottom: '1px solid var(--iven-grid)' }}
                  onClick={() => toggle(task)}
                >
                  <div
                    className="flex items-center justify-center rounded-[6px] flex-shrink-0 transition-colors"
                    style={{ width: 22, height: 22, border: '1px solid var(--iven-grid)', background: 'transparent' }}
                  />
                  <span className="flex-1 text-[15px]" style={{ color: (task.due_at && isOverdue(task.due_at)) ? '#6B4F2A' : 'var(--iven-text)' }}>
                    {task.title}
                  </span>
                  <span className="font-mono text-[12px]" style={{ color: 'var(--iven-muted)' }}>{metaFor(task)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); remove(task.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--iven-muted)', padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {done.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer"
                  style={{ borderBottom: '1px solid var(--iven-grid)' }}
                  onClick={() => toggle(task)}
                >
                  <div
                    className="flex items-center justify-center rounded-[6px] flex-shrink-0"
                    style={{ width: 22, height: 22, border: '1px solid var(--iven-accent)', background: 'var(--iven-accent)' }}
                  >
                    <Check size={13} strokeWidth={3.2} style={{ color: '#2C1F0E' }} />
                  </div>
                  <span className="flex-1 text-[15px]" style={{ color: 'var(--iven-muted)', textDecoration: 'line-through' }}>
                    {task.title}
                  </span>
                  <span className="font-mono text-[12px]" style={{ color: 'var(--iven-muted)' }}>{metaFor(task)}</span>
                </div>
              ))}
            </>
          )}

          {/* Add task */}
          <div className="flex items-center gap-4 px-6 py-4">
            <div
              className="flex items-center justify-center rounded-[6px] flex-shrink-0"
              style={{ width: 22, height: 22, border: '1px dashed var(--iven-grid)', color: 'var(--iven-muted)' }}
            >
              <Plus size={13} />
            </div>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Add a task…"
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-inter"
              style={{ border: 'none', color: 'var(--iven-text)' }}
            />
            <button
              onClick={addTask}
              className="font-mono text-[11px] tracking-[1.5px] font-semibold rounded-lg px-4 py-[10px] transition-colors"
              style={{ background: 'var(--iven-accent)', color: '#2C1F0E', border: 'none', cursor: 'pointer' }}
            >
              ADD
            </button>
          </div>
        </div>

        {notifyState === 'default' && (
          <button
            onClick={() => requestNotificationPermission().then(() => setNotifyState(getNotificationSupport()))}
            className="mt-3 font-mono text-[10px] tracking-[1.5px] transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--iven-muted)' }}
          >
            ENABLE DUE REMINDERS →
          </button>
        )}
      </div>
    </IvenModule>
  )
}
