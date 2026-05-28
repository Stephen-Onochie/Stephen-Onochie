'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isDueToday } from '@/lib/todo/parse'
import {
  createTodo,
  fetchLists,
  fetchTodos,
  setTodoCompleted,
} from '@/lib/todo/supabase'
import type { Todo, TodoList } from '@/types/todo'

interface TodaysTasksProps {
  /** Max items shown before the strip starts scrolling. */
  max: number
  /** Notify parent when the todo set changes so reminders can be rescheduled. */
  onTodosChange?: (todos: Todo[]) => void
}

// Today's strip: a compact, theme-aware view of due-today tasks rendered
// inline under the clock face. Reads from the same `todos` table as the full
// Tasks page — completing here mirrors there and vice-versa on next load.
export default function TodaysTasks({ max, onTodosChange }: TodaysTasksProps) {
  const supabase = useMemo(() => createClient(), [])
  const [todos, setTodos] = useState<Todo[]>([])
  const [lists, setLists] = useState<TodoList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const onTodosChangeRef = useRef(onTodosChange)
  useEffect(() => {
    onTodosChangeRef.current = onTodosChange
  }, [onTodosChange])

  const load = useCallback(async () => {
    try {
      const [l, t] = await Promise.all([fetchLists(supabase), fetchTodos(supabase)])
      setLists(l)
      setTodos(t)
      onTodosChangeRef.current?.(t)
      setError(null)
    } catch {
      setError('Sign in to sync today’s tasks.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const listColor = useCallback(
    (id: string | null) => lists.find((l) => l.id === id)?.color ?? null,
    [lists]
  )

  // Anything due today and not done — sorted active-first by due time.
  const visible = useMemo(() => {
    const dueToday = todos.filter((t) => t.due_at && isDueToday(t.due_at))
    return dueToday.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return (a.due_at ?? '').localeCompare(b.due_at ?? '')
    })
  }, [todos])

  const activeCount = visible.filter((t) => !t.completed).length

  async function handleToggle(id: string, completed: boolean) {
    setTodos((prev) => {
      const next = prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
            }
          : t
      )
      onTodosChangeRef.current?.(next)
      return next
    })
    try {
      await setTodoCompleted(supabase, id, completed)
    } catch {
      load()
    }
  }

  // Inline quick add. No NL parsing — anything you type gets a due_at of
  // today at the current time so it shows up here immediately. For richer
  // capture (lists, dates, notes), use the Tasks tab.
  async function handleAdd() {
    const title = draft.trim()
    if (!title) return
    setDraft('')
    const dueAt = new Date().toISOString()
    const optimistic: Todo = {
      id: `tmp-${Date.now()}`,
      user_id: '',
      list_id: null,
      title,
      notes: null,
      due_at: dueAt,
      completed: false,
      completed_at: null,
      sort_order: 0,
      created_at: new Date().toISOString(),
    }
    setTodos((prev) => {
      const next = [optimistic, ...prev]
      onTodosChangeRef.current?.(next)
      return next
    })
    try {
      const saved = await createTodo(supabase, { title, due_at: dueAt })
      setTodos((prev) => {
        const next = prev.map((t) => (t.id === optimistic.id ? saved : t))
        onTodosChangeRef.current?.(next)
        return next
      })
    } catch {
      setTodos((prev) => {
        const next = prev.filter((t) => t.id !== optimistic.id)
        onTodosChangeRef.current?.(next)
        return next
      })
      setError('Could not save that task.')
    }
  }

  // Cap height around `max` rows; anything beyond scrolls.
  const ROW_PX = 36
  const maxHeight = `${Math.max(1, max) * ROW_PX}px`

  return (
    <section
      aria-label="Today's tasks"
      className="w-full max-w-md mx-auto mt-6 md:mt-8 rounded-2xl border backdrop-blur-sm"
      style={{
        borderColor: 'var(--nc-border)',
        backgroundColor: 'color-mix(in srgb, var(--nc-surface) 80%, transparent)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 pt-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.25em]"
        style={{ color: 'var(--nc-muted)' }}
      >
        <span>Today</span>
        <span style={{ color: 'var(--nc-accent)' }}>
          {loading ? '…' : `${activeCount} open`}
        </span>
      </div>

      {error ? (
        <p
          className="px-4 pb-3 font-inter text-xs"
          style={{ color: 'var(--nc-muted)' }}
        >
          {error}
        </p>
      ) : (
        <>
          <ul
            className="overflow-y-auto px-2"
            style={{ maxHeight }}
          >
            {!loading && visible.length === 0 && (
              <li
                className="px-2 py-3 font-inter text-xs italic"
                style={{ color: 'var(--nc-muted)' }}
              >
                Nothing due today.
              </li>
            )}
            {visible.map((todo) => {
              const dot = listColor(todo.list_id)
              return (
                <li
                  key={todo.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-[color:var(--nc-grid)]/30"
                >
                  <button
                    onClick={() => handleToggle(todo.id, !todo.completed)}
                    aria-label={
                      todo.completed ? 'Mark incomplete' : 'Mark complete'
                    }
                    className="h-4 w-4 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center"
                    style={{
                      borderColor: todo.completed
                        ? 'var(--nc-accent)'
                        : 'var(--nc-border)',
                      backgroundColor: todo.completed
                        ? 'var(--nc-accent)'
                        : 'transparent',
                    }}
                  >
                    {todo.completed && (
                      <span
                        className="text-[9px] leading-none"
                        style={{ color: 'var(--nc-bg)' }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                  <span
                    className="flex-1 truncate font-inter text-sm"
                    style={{
                      color: todo.completed
                        ? 'var(--nc-muted)'
                        : 'var(--nc-text)',
                      textDecoration: todo.completed ? 'line-through' : 'none',
                    }}
                  >
                    {todo.title}
                  </span>
                  {todo.notes && (
                    <span
                      aria-label="Has notes"
                      title="Has notes"
                      className="text-xs"
                      style={{ color: 'var(--nc-muted)' }}
                    >
                      📝
                    </span>
                  )}
                  {dot && (
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: dot }}
                    />
                  )}
                </li>
              )
            })}
          </ul>

          <div
            className="flex items-center gap-2 px-3 py-2 border-t"
            style={{ borderColor: 'var(--nc-border)' }}
          >
            <span
              aria-hidden
              className="font-mono text-sm"
              style={{ color: 'var(--nc-muted)' }}
            >
              +
            </span>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              placeholder="Add to today"
              className="flex-1 bg-transparent outline-none font-inter text-sm"
              style={{ color: 'var(--nc-text)' }}
            />
          </div>
        </>
      )}
    </section>
  )
}
