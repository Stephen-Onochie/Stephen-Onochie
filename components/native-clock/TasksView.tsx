'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Trash2 } from 'lucide-react'
import NativeClockNav from '@/components/native-clock/NativeClockNav'
import NativeClockShell from '@/components/native-clock/NativeClockShell'
import { useNativeClockSettings } from '@/hooks/useNativeClockSettings'
import { createClient } from '@/lib/supabase/client'
import { formatDue, isDueToday, isOverdue, parseTodoInput } from '@/lib/todo/parse'
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
import {
  getNotificationSupport,
  requestNotificationPermission,
  scheduleDueReminders,
} from '@/lib/todo/notifications'
import type { Todo, TodoList, ViewId } from '@/types/todo'

const EMOJI_CHOICES = ['🗂️', '💼', '🏠', '🛒', '💡', '🏋️', '✈️', '📚', '🎯', '🔧']

// Full task manager, themed to the active Native Clock palette. Mirrors the
// behaviors that used to live at /apps/todo (lists, today/inbox views, quick
// capture with NL date parsing) and adds a task-detail dialog where notes
// live.
export default function TasksView() {
  const { settings, hydrated } = useNativeClockSettings()
  const supabase = useMemo(() => createClient(), [])

  const [lists, setLists] = useState<TodoList[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [view, setView] = useState<ViewId>('today')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newListOpen, setNewListOpen] = useState(false)
  const [editing, setEditing] = useState<Todo | null>(null)
  const [notifyState, setNotifyState] = useState<string>('default')
  const [draft, setDraft] = useState('')
  const quickAddRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setNotifyState(getNotificationSupport())
  }, [])

  // Reschedule reminders whenever the set changes — same contract as the
  // clock view; the helper is idempotent across mounts.
  useEffect(() => {
    return scheduleDueReminders(todos)
  }, [todos])

  // Focus quick-add on "/" — keep parity with the old todo page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        quickAddRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = useMemo(() => {
    if (view === 'today') {
      return todos.filter((t) => !t.completed && t.due_at && isDueToday(t.due_at))
    }
    if (view === 'inbox') {
      return todos.filter((t) => t.list_id === null)
    }
    return todos.filter((t) => t.list_id === view)
  }, [todos, view])

  const active = visible.filter((t) => !t.completed)
  const done = visible.filter((t) => t.completed)

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

  const preview = draft.trim() ? parseTodoInput(draft) : null

  async function handleAdd() {
    const trimmed = draft.trim()
    if (!trimmed) return
    const { title, dueAt } = parseTodoInput(trimmed)
    setDraft('')
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
      const saved = await createTodo(supabase, {
        title,
        due_at: dueAt,
        list_id: listId,
      })
      setTodos((prev) => prev.map((t) => (t.id === optimistic.id ? saved : t)))
    } catch {
      setTodos((prev) => prev.filter((t) => t.id !== optimistic.id))
      setError('Could not save that task.')
    }
  }

  async function handleToggle(id: string, completed: boolean) {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed,
              completed_at: completed ? new Date().toISOString() : null,
            }
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
    setEditing(null)
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

  async function handleSaveEdit(patch: {
    title: string
    notes: string | null
    due_at: string | null
    list_id: string | null
  }) {
    if (!editing) return
    const id = editing.id
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    )
    setEditing(null)
    try {
      await updateTodo(supabase, id, patch)
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

  // Render under the active theme; settings hydration is async but we still
  // want a sensible default during paint so the page doesn't flash.
  const theme = settings?.theme ?? 'light'

  if (!hydrated || !settings) {
    return (
      <NativeClockShell theme={theme}>
        <div className="flex-1 flex items-center justify-center">
          <p
            className="font-mono text-xs uppercase tracking-[0.2em] animate-pulse"
            style={{ color: 'var(--nc-muted)' }}
          >
            Loading…
          </p>
        </div>
        <div className="h-[60px]" aria-hidden />
        <NativeClockNav />
      </NativeClockShell>
    )
  }

  return (
    <NativeClockShell theme={theme}>
      <div className="flex-1 flex flex-col px-4 md:px-8 pt-4 md:pt-6 pb-24">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <Link
              href="/apps"
              className="font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: 'var(--nc-muted)' }}
            >
              ← My Apps
            </Link>
            <p
              className="font-mono text-[10px] uppercase tracking-[0.4em]"
              style={{ color: 'var(--nc-accent)' }}
            >
              Tasks
            </p>
          </div>
          <div
            className="font-inter text-xs"
            style={{ color: 'var(--nc-muted)' }}
          >
            {notifyState === 'default' ? (
              <button
                onClick={enableNotifications}
                className="underline"
                style={{ color: 'var(--nc-accent)' }}
              >
                Enable reminders
              </button>
            ) : (
              <span>{active.length} open</span>
            )}
          </div>
        </div>

        {/* Category / smart-view chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <ViewChip
            label="Today"
            icon="⭐"
            count={todayCount}
            active={view === 'today'}
            onClick={() => setView('today')}
          />
          <ViewChip
            label="Inbox"
            icon="📥"
            count={inboxCount}
            active={view === 'inbox'}
            onClick={() => setView('inbox')}
          />
          {lists.map((l) => (
            <ViewChip
              key={l.id}
              label={l.name}
              icon={l.emoji}
              dotColor={l.color}
              count={counts[l.id] ?? 0}
              active={view === l.id}
              onClick={() => setView(l.id)}
              onDelete={
                view === l.id
                  ? () => {
                      if (confirm(`Delete "${l.name}" and all its tasks?`)) {
                        handleDeleteList(l.id)
                      }
                    }
                  : undefined
              }
            />
          ))}
          <button
            onClick={() => setNewListOpen(true)}
            className="shrink-0 rounded-full border border-dashed px-4 py-2 font-inter text-sm"
            style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-muted)' }}
          >
            + New list
          </button>
        </div>

        {/* Quick add */}
        <div
          className="mt-4 rounded-2xl border px-4 py-3"
          style={{
            borderColor: 'var(--nc-border)',
            backgroundColor: 'var(--nc-surface)',
          }}
        >
          <div className="flex items-center gap-3">
            <span aria-hidden style={{ color: 'var(--nc-muted)' }}>
              +
            </span>
            <input
              ref={quickAddRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none font-inter text-sm"
              style={{ color: 'var(--nc-text)' }}
            />
          </div>
          {preview?.dueAt && (
            <p
              className="mt-1.5 pl-7 font-inter text-xs"
              style={{ color: 'var(--nc-accent)' }}
            >
              📅 {formatDue(preview.dueAt)}
            </p>
          )}
        </div>

        {loading && (
          <div className="mt-4 flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-2xl animate-pulse"
                style={{ backgroundColor: 'var(--nc-surface)' }}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="py-16 text-center">
            <p className="font-inter text-sm" style={{ color: 'var(--nc-muted)' }}>
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="mt-4 flex flex-col gap-2">
            {active.length === 0 && done.length === 0 && (
              <div className="py-16 text-center">
                <p className="mb-3 text-4xl">
                  {view === 'today' ? '⭐' : '✅'}
                </p>
                <p
                  className="font-inter text-sm"
                  style={{ color: 'var(--nc-muted)' }}
                >
                  {view === 'today'
                    ? 'Nothing due today. Add something above.'
                    : 'All clear here. Add your first task above.'}
                </p>
              </div>
            )}

            {active.map((todo) => (
              <TaskRow
                key={todo.id}
                todo={todo}
                listColor={
                  lists.find((l) => l.id === todo.list_id)?.color ?? null
                }
                onToggle={handleToggle}
                onOpen={() => setEditing(todo)}
              />
            ))}

            {done.length > 0 && (
              <>
                <p
                  className="mt-4 px-1 font-inter text-xs uppercase tracking-wide"
                  style={{ color: 'var(--nc-muted)' }}
                >
                  Completed · {done.length}
                </p>
                {done.map((todo) => (
                  <TaskRow
                    key={todo.id}
                    todo={todo}
                    listColor={
                      lists.find((l) => l.id === todo.list_id)?.color ?? null
                    }
                    onToggle={handleToggle}
                    onOpen={() => setEditing(todo)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <NativeClockNav />

      {/* New list dialog */}
      <Dialog.Root open={newListOpen} onOpenChange={setNewListOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl p-6"
            style={{
              backgroundColor: 'var(--nc-bg)',
              color: 'var(--nc-text)',
              borderTop: '1px solid var(--nc-border)',
            }}
          >
            <Dialog.Title
              className="mb-6 font-playfair text-2xl font-bold"
              style={{ color: 'var(--nc-text)' }}
            >
              New List
            </Dialog.Title>
            <NewListInline
              onCreate={handleCreateList}
              onCancel={() => setNewListOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Task detail dialog */}
      <Dialog.Root
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl p-6"
            style={{
              backgroundColor: 'var(--nc-bg)',
              color: 'var(--nc-text)',
              borderTop: '1px solid var(--nc-border)',
            }}
          >
            <Dialog.Title
              className="mb-6 font-playfair text-2xl font-bold"
              style={{ color: 'var(--nc-text)' }}
            >
              Task
            </Dialog.Title>
            {editing && (
              <TaskDetailForm
                todo={editing}
                lists={lists}
                onSave={handleSaveEdit}
                onDelete={() => handleDelete(editing.id)}
                onCancel={() => setEditing(null)}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </NativeClockShell>
  )
}

// --- Sub-components ---

function ViewChip({
  label,
  icon,
  count,
  active,
  dotColor,
  onClick,
  onDelete,
}: {
  label: string
  icon: string
  count: number
  active: boolean
  dotColor?: string
  onClick: () => void
  onDelete?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 flex items-center gap-2 rounded-full border px-4 py-2 font-inter text-sm transition-colors"
      style={{
        borderColor: active ? 'var(--nc-accent)' : 'var(--nc-border)',
        backgroundColor: active
          ? 'color-mix(in srgb, var(--nc-accent) 20%, transparent)'
          : 'var(--nc-surface)',
        color: active ? 'var(--nc-accent)' : 'var(--nc-muted)',
      }}
    >
      <span aria-hidden>{icon}</span>
      <span className="font-medium">{label}</span>
      {dotColor && (
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {count > 0 && <span className="text-xs opacity-70">{count}</span>}
      {onDelete && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Delete ${label} list`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="ml-1"
          style={{ color: 'var(--nc-muted)' }}
        >
          <Trash2 size={14} />
        </span>
      )}
    </button>
  )
}

function TaskRow({
  todo,
  listColor,
  onToggle,
  onOpen,
}: {
  todo: Todo
  listColor: string | null
  onToggle: (id: string, completed: boolean) => void
  onOpen: () => void
}) {
  const overdue = todo.due_at && !todo.completed && isOverdue(todo.due_at)

  return (
    <div
      className="group flex items-start gap-3 rounded-2xl border px-4 py-3"
      style={{
        borderColor: 'var(--nc-border)',
        backgroundColor: 'var(--nc-surface)',
      }}
    >
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
        className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: todo.completed ? 'var(--nc-accent)' : 'var(--nc-border)',
          backgroundColor: todo.completed ? 'var(--nc-accent)' : 'transparent',
        }}
      >
        {todo.completed && (
          <span
            className="text-[10px] leading-none"
            style={{ color: 'var(--nc-bg)' }}
          >
            ✓
          </span>
        )}
      </button>

      <button
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
        aria-label="Open task"
      >
        <p
          className="font-inter text-sm"
          style={{
            color: todo.completed ? 'var(--nc-muted)' : 'var(--nc-text)',
            textDecoration: todo.completed ? 'line-through' : 'none',
          }}
        >
          {todo.title}
        </p>
        {todo.due_at && (
          <p
            className="mt-0.5 font-inter text-xs"
            style={{
              color: overdue ? '#c0392b' : 'var(--nc-muted)',
            }}
          >
            {overdue ? '⚠ ' : '📅 '}
            {formatDue(todo.due_at)}
          </p>
        )}
      </button>

      <div className="flex items-center gap-2 shrink-0">
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
        {listColor && (
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: listColor }}
          />
        )}
      </div>
    </div>
  )
}

function TaskDetailForm({
  todo,
  lists,
  onSave,
  onDelete,
  onCancel,
}: {
  todo: Todo
  lists: TodoList[]
  onSave: (patch: {
    title: string
    notes: string | null
    due_at: string | null
    list_id: string | null
  }) => void
  onDelete: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(todo.title)
  const [notes, setNotes] = useState(todo.notes ?? '')
  const [listId, setListId] = useState<string>(todo.list_id ?? '')
  // datetime-local needs a "YYYY-MM-DDTHH:mm" string in local time.
  const [dueLocal, setDueLocal] = useState(() => isoToLocalInput(todo.due_at))

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    onSave({
      title: trimmed,
      notes: notes.trim() ? notes.trim() : null,
      due_at: dueLocal ? localInputToIso(dueLocal) : null,
      list_id: listId || null,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="w-full rounded-xl border px-4 py-3 font-inter outline-none"
          style={{
            borderColor: 'var(--nc-border)',
            backgroundColor: 'var(--nc-surface)',
            color: 'var(--nc-text)',
          }}
        />
      </Field>

      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add context, links, or sub-steps…"
          className="w-full rounded-xl border px-4 py-3 font-inter text-sm outline-none resize-y"
          style={{
            borderColor: 'var(--nc-border)',
            backgroundColor: 'var(--nc-surface)',
            color: 'var(--nc-text)',
          }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="List">
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="w-full rounded-xl border px-3 py-3 font-inter text-sm outline-none"
            style={{
              borderColor: 'var(--nc-border)',
              backgroundColor: 'var(--nc-surface)',
              color: 'var(--nc-text)',
            }}
          >
            <option value="">📥 Inbox</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.emoji} {l.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Due">
          <input
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
            className="w-full rounded-xl border px-3 py-3 font-inter text-sm outline-none"
            style={{
              borderColor: 'var(--nc-border)',
              backgroundColor: 'var(--nc-surface)',
              color: 'var(--nc-text)',
            }}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={() => {
            if (confirm('Delete this task?')) onDelete()
          }}
          className="font-inter text-sm"
          style={{ color: '#c0392b' }}
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border px-4 py-2 font-inter text-sm"
            style={{
              borderColor: 'var(--nc-border)',
              color: 'var(--nc-muted)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="rounded-xl px-4 py-2 font-inter text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: 'var(--nc-accent)',
              color: 'var(--nc-bg)',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function NewListInline({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, emoji: string) => void | Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0])
  const [saving, setSaving] = useState(false)

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    await onCreate(trimmed, emoji)
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Icon">
        <div className="flex flex-wrap gap-2">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="h-10 w-10 rounded-xl text-xl transition-colors"
              style={{
                backgroundColor:
                  emoji === e
                    ? 'color-mix(in srgb, var(--nc-accent) 30%, transparent)'
                    : 'var(--nc-surface)',
                boxShadow:
                  emoji === e ? 'inset 0 0 0 2px var(--nc-accent)' : undefined,
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </Field>

      <Field label="List name">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="e.g. Groceries, Work, Errands"
          className="w-full rounded-xl border px-4 py-3 font-inter outline-none"
          style={{
            borderColor: 'var(--nc-border)',
            backgroundColor: 'var(--nc-surface)',
            color: 'var(--nc-text)',
          }}
        />
      </Field>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border py-3 font-inter text-sm"
          style={{
            borderColor: 'var(--nc-border)',
            color: 'var(--nc-muted)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          className="flex-1 rounded-xl py-3 font-inter text-sm font-medium disabled:opacity-50"
          style={{
            backgroundColor: 'var(--nc-accent)',
            color: 'var(--nc-bg)',
          }}
        >
          {saving ? 'Creating…' : 'Create list'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p
        className="mb-2 font-inter text-xs font-medium uppercase tracking-wide"
        style={{ color: 'var(--nc-muted)' }}
      >
        {label}
      </p>
      {children}
    </div>
  )
}

// ISO ↔ datetime-local helpers: datetime-local has no timezone, so we present
// and accept values in the user's local time and reconstruct the ISO string.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
