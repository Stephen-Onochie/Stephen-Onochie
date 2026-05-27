'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/apps/AppHeader'
import QuickAdd from '@/components/todo/QuickAdd'
import TodoItem from '@/components/todo/TodoItem'
import ListSidebar from '@/components/todo/ListSidebar'
import NewListForm from '@/components/todo/NewListForm'
import type { Todo, TodoList, ViewId } from '@/types/todo'
import {
  createList,
  createTodo,
  deleteList,
  deleteTodo,
  fetchLists,
  fetchTodos,
  nextListColor,
  setTodoCompleted,
} from '@/lib/todo/supabase'
import { isDueToday } from '@/lib/todo/parse'
import {
  getNotificationSupport,
  requestNotificationPermission,
  scheduleDueReminders,
} from '@/lib/todo/notifications'

export default function TodoPage() {
  const [lists, setLists] = useState<TodoList[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [view, setView] = useState<ViewId>('today')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newListOpen, setNewListOpen] = useState(false)
  const [notifyState, setNotifyState] = useState<string>('default')

  const supabase = createClient()

  const load = useCallback(async () => {
    try {
      const [l, t] = await Promise.all([fetchLists(supabase), fetchTodos(supabase)])
      setLists(l)
      setTodos(t)
      setError(null)
    } catch {
      setError('Failed to load todos. Is Supabase configured?')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setNotifyState(getNotificationSupport())
  }, [])

  // Reschedule browser reminders whenever the todo set changes.
  useEffect(() => {
    return scheduleDueReminders(todos)
  }, [todos])

  // Todos that belong to the current view.
  const visible = useMemo(() => {
    if (view === 'today') {
      return todos.filter(
        (t) => !t.completed && t.due_at && isDueToday(t.due_at)
      )
    }
    if (view === 'inbox') {
      return todos.filter((t) => t.list_id === null)
    }
    return todos.filter((t) => t.list_id === view)
  }, [todos, view])

  const active = visible.filter((t) => !t.completed)
  const done = visible.filter((t) => t.completed)

  // Counts for the sidebar pills (active, incomplete todos only).
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of todos) {
      if (t.completed || !t.list_id) continue
      map[t.list_id] = (map[t.list_id] ?? 0) + 1
    }
    return map
  }, [todos])

  const todayCount = todos.filter(
    (t) => !t.completed && t.due_at && isDueToday(t.due_at)
  ).length
  const inboxCount = todos.filter((t) => !t.completed && !t.list_id).length

  async function handleAdd(title: string, dueAt: string | null) {
    // In a smart view, new items land in the Inbox; otherwise the active list.
    const listId = view === 'today' || view === 'inbox' ? null : view
    const optimistic: Todo = {
      id: `tmp-${Date.now()}`,
      user_id: '',
      list_id: listId,
      title,
      notes: null,
      due_at: dueAt,
      completed: false,
      completed_at: null,
      sort_order: 0,
      created_at: new Date().toISOString(),
    }
    setTodos((prev) => [optimistic, ...prev])
    try {
      const saved = await createTodo(supabase, { title, due_at: dueAt, list_id: listId })
      setTodos((prev) => prev.map((t) => (t.id === optimistic.id ? saved : t)))
    } catch {
      setTodos((prev) => prev.filter((t) => t.id !== optimistic.id))
      setError('Could not save that todo.')
    }
  }

  async function handleToggle(id: string, completed: boolean) {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
          : t
      )
    )
    try {
      await setTodoCompleted(supabase, id, completed)
    } catch {
      load()
    }
  }

  async function handleDelete(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    try {
      await deleteTodo(supabase, id)
    } catch {
      load()
    }
  }

  async function handleCreateList(name: string, emoji: string) {
    try {
      const list = await createList(supabase, {
        name,
        emoji,
        color: nextListColor(lists),
        sort_order: lists.length,
      })
      setLists((prev) => [...prev, list])
      setView(list.id)
      setNewListOpen(false)
    } catch {
      setError('Could not create that list.')
    }
  }

  async function handleDeleteList(id: string) {
    setLists((prev) => prev.filter((l) => l.id !== id))
    setTodos((prev) => prev.filter((t) => t.list_id !== id))
    setView('today')
    try {
      await deleteList(supabase, id)
    } catch {
      load()
    }
  }

  async function enableNotifications() {
    const state = await requestNotificationPermission()
    setNotifyState(state)
  }

  const activeList = lists.find((l) => l.id === view)
  const placeholder =
    view === 'today'
      ? 'Add to Inbox — try "call mom tomorrow 5pm"'
      : view === 'inbox'
      ? 'Add to Inbox — try "pay rent friday"'
      : `Add to ${activeList?.name ?? 'list'} — try "review deck monday 9am"`

  return (
    <main className="min-h-screen bg-beige pb-16">
      <AppHeader
        title="Todo"
        right={
          notifyState === 'default' ? (
            <button
              onClick={enableNotifications}
              className="font-inter text-xs text-brownAccent underline"
            >
              Enable reminders
            </button>
          ) : (
            <span className="font-inter text-sm text-textMuted">
              {active.length} open
            </span>
          )
        }
      />

      <div className="mx-auto max-w-lg px-4 pt-4">
        <ListSidebar
          lists={lists}
          activeView={view}
          counts={counts}
          todayCount={todayCount}
          inboxCount={inboxCount}
          onSelect={setView}
          onNewList={() => setNewListOpen(true)}
          onDeleteList={handleDeleteList}
        />

        <div className="mt-4">
          <QuickAdd placeholder={placeholder} onAdd={handleAdd} />
        </div>

        {loading && (
          <div className="mt-4 flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        )}

        {error && (
          <div className="py-16 text-center">
            <p className="font-inter text-sm text-textMuted">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="mt-4 flex flex-col gap-3">
            {active.length === 0 && done.length === 0 && (
              <div className="py-20 text-center">
                <p className="mb-3 text-4xl">
                  {view === 'today' ? '⭐' : '✅'}
                </p>
                <p className="font-inter text-sm text-textMuted">
                  {view === 'today'
                    ? 'Nothing due today. Add something above.'
                    : 'All clear here. Add your first todo above.'}
                </p>
              </div>
            )}

            {active.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}

            {done.length > 0 && (
              <>
                <p className="mt-4 px-1 font-inter text-xs uppercase tracking-wide text-textMuted">
                  Completed · {done.length}
                </p>
                {done.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <Dialog.Root open={newListOpen} onOpenChange={setNewListOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-beige p-6">
            <Dialog.Title className="mb-6 font-playfair text-2xl font-bold text-textPrimary">
              New List
            </Dialog.Title>
            <NewListForm
              onCreate={handleCreateList}
              onCancel={() => setNewListOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  )
}
