'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createRecurrence,
  createTag,
  createTodo,
  completeTodo,
  deactivateRecurrence,
  deleteTodo,
  fetchLists,
  fetchRecurrences,
  fetchTags,
  fetchTaskTagMap,
  fetchTodos,
  setPinned,
  setTaskTags,
  setTodoCompleted,
  reorderTodo,
  updateTodo,
} from '@/lib/todo/supabase'
import { formatDue, isDueToday, isOverdue, parseTodoInput } from '@/lib/todo/parse'
import {
  getNotificationSupport,
  requestNotificationPermission,
  scheduleDueReminders,
} from '@/lib/todo/notifications'
import { emitCompletionEvent } from '@/lib/todo/module-events'
import IvenModule from '@/components/iven/IvenModule'
import TaskDetailDialog, { type TaskDetailSave } from '@/components/todo/TaskDetailDialog'
import CommandPalette from '@/components/todo/CommandPalette'
import WeeklyReview from '@/components/todo/WeeklyReview'
import type { Todo, TodoList, Tag, Recurrence, ViewId } from '@/types/todo'
import { Check, Plus, Inbox, CalendarDays, Trash2, Repeat, Pin, Sparkles, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const VIEWS: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  { id: 'today', label: 'TODAY', icon: <CalendarDays size={13} /> },
  { id: 'inbox', label: 'INBOX', icon: <Inbox size={13} /> },
]

const MAX_PINS = 3
const DATE_HINT = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|day after|end of|eod|noon|midnight|weekend|month|quarter|\d{1,2}(st|nd|rd|th))\b/i

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function metaFor(todo: Todo) {
  if (todo.due_at) return formatDue(todo.due_at)
  const d = new Date(todo.created_at)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

// Priority → gold-weighted accent (no loud reds; deepen the accent instead).
function priorityColor(p: number): string | null {
  if (p === 1) return 'var(--iven-accent)'
  if (p === 2) return 'rgba(201, 168, 76, 0.6)'
  if (p === 3) return 'rgba(201, 168, 76, 0.32)'
  return null
}

export default function TodoPage() {
  const supabase = useMemo(() => createClient(), [])
  const [lists, setLists] = useState<TodoList[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [recurrences, setRecurrences] = useState<Recurrence[]>([])
  const [taskTagMap, setTaskTagMap] = useState<Record<string, string[]>>({})
  const [view, setView] = useState<ViewId>('today')
  const [filterTagId, setFilterTagId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [notifyState, setNotifyState] = useState('default')
  const [editing, setEditing] = useState<Todo | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [pinWarning, setPinWarning] = useState(false)
  const quickAddRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const load = useCallback(async () => {
    try {
      // Lists + todos are the critical pair; a failure here is surfaced verbatim.
      const [l, t] = await Promise.all([fetchLists(supabase), fetchTodos(supabase)])
      setLists(l)
      setTodos(t)
      // Tags / recurrences / task-tags are additive — never let them blank the page.
      const [tg, rec, map] = await Promise.all([
        fetchTags(supabase).catch(() => [] as Tag[]),
        fetchRecurrences(supabase).catch(() => [] as Recurrence[]),
        fetchTaskTagMap(supabase).catch(() => ({} as Record<string, string[]>)),
      ])
      setTags(tg)
      setRecurrences(rec)
      setTaskTagMap(map)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])
  useEffect(() => { setNotifyState(getNotificationSupport()) }, [])
  useEffect(() => scheduleDueReminders(todos), [todos])

  // --- Filtering ---
  const matchesView = useCallback((t: Todo) => {
    if (view === 'today') return !!t.due_at && isDueToday(t.due_at)
    if (view === 'inbox') return !t.list_id
    return t.list_id === view
  }, [view])

  const topLevel = useMemo(() => todos.filter(t => !t.parent_task_id), [todos])

  const inScope = useMemo(() => topLevel.filter(t => {
    if (!matchesView(t)) return false
    if (filterTagId && !(taskTagMap[t.id] ?? []).includes(filterTagId)) return false
    return true
  }), [topLevel, matchesView, filterTagId, taskTagMap])

  const pinned = useMemo(() => inScope.filter(t => t.pinned && !t.completed), [inScope])
  const activeStream = useMemo(() => inScope.filter(t => !t.pinned && !t.completed), [inScope])
  const doneStream = useMemo(() => inScope.filter(t => t.completed), [inScope])

  const childrenOf = useCallback((id: string) => todos.filter(t => t.parent_task_id === id), [todos])

  // --- Add ---
  async function addTask(rawInput?: string) {
    const input = (rawInput ?? draft).trim()
    if (!input) return
    setDraft('')
    let parsed = parseTodoInput(input)

    // Sonnet fallback only when the local parser missed a date-ish phrase.
    if (!parsed.hadDateToken && DATE_HINT.test(input)) {
      try {
        const res = await fetch('/api/todo/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input, projects: lists.map(l => l.name) }),
        })
        if (res.ok) {
          const ai = await res.json()
          parsed = {
            title: ai.title || parsed.title,
            dueAt: ai.due_at ?? parsed.dueAt,
            priority: ai.priority || parsed.priority,
            project: ai.project ?? parsed.project,
            tags: ai.tags?.length ? ai.tags : parsed.tags,
            hadDateToken: !!ai.due_at,
          }
        }
      } catch { /* graceful degradation to local parse */ }
    }

    const projectList = parsed.project
      ? lists.find(l => l.name.toLowerCase() === parsed.project!.toLowerCase())
      : (typeof view === 'string' && view !== 'today' && view !== 'inbox' ? lists.find(l => l.id === view) : undefined)
    const due = parsed.dueAt ?? (view === 'today' ? new Date().toISOString() : undefined)
    const structured = parsed.hadDateToken || !!parsed.project || parsed.tags.length > 0

    const created = await createTodo(supabase, {
      title: parsed.title,
      due_at: due,
      list_id: projectList?.id,
      priority: parsed.priority,
      source: structured ? 'quick_add' : 'manual',
    })
    setTodos(prev => [created, ...prev])

    if (parsed.tags.length) {
      const ids: string[] = []
      for (const name of parsed.tags) {
        let tag = tags.find(t => t.name.toLowerCase() === name.toLowerCase())
        if (!tag) {
          tag = await createTag(supabase, { name, color: '#C9A84C' })
          setTags(prev => [...prev, tag!])
        }
        ids.push(tag.id)
      }
      await setTaskTags(supabase, created.id, ids)
      setTaskTagMap(prev => ({ ...prev, [created.id]: ids }))
    }
  }

  // --- Complete (with recurrence + cross-module event) ---
  async function toggle(task: Todo) {
    const completing = !task.completed
    setTodos(prev => prev.map(t => t.id === task.id ? { ...t, completed: completing } : t))
    if (completing) {
      const clone = await completeTodo(supabase, task)
      await emitCompletionEvent(supabase, task, lists.find(l => l.id === task.list_id))
      if (clone) setTodos(prev => [clone, ...prev])
      if (task.parent_task_id) await maybeCompleteParent(task.parent_task_id, task.id)
    } else {
      await setTodoCompleted(supabase, task.id, false)
    }
  }

  // When every child of a parent is complete, auto-complete the parent.
  // `justCompletedId` is treated as done since local state may not have flushed.
  async function maybeCompleteParent(parentId: string, justCompletedId: string) {
    const siblings = todos.filter(t => t.parent_task_id === parentId)
    const allDone = siblings.length > 0 && siblings.every(s => s.id === justCompletedId || s.completed)
    if (!allDone) return
    const parent = todos.find(t => t.id === parentId)
    if (parent && !parent.completed) {
      setTodos(prev => prev.map(t => t.id === parentId ? { ...t, completed: true } : t))
      await setTodoCompleted(supabase, parentId, true)
    }
  }

  async function remove(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id && t.parent_task_id !== id))
    await deleteTodo(supabase, id)
  }

  async function togglePin(task: Todo) {
    if (!task.pinned && pinned.length >= MAX_PINS) {
      setPinWarning(true)
      setTimeout(() => setPinWarning(false), 2500)
      return
    }
    setTodos(prev => prev.map(t => t.id === task.id ? { ...t, pinned: !t.pinned } : t))
    await setPinned(supabase, task.id, !task.pinned)
  }

  // --- Drag reorder within the active stream (fractional position) ---
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = activeStream.map(t => t.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    const reordered = [...activeStream]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const idx = reordered.findIndex(t => t.id === moved.id)
    const prevPos = idx > 0 ? (reordered[idx - 1].position ?? idx - 1) : null
    const nextPos = idx < reordered.length - 1 ? (reordered[idx + 1].position ?? idx + 1) : null
    let newPos: number
    if (prevPos === null && nextPos === null) newPos = 0
    else if (prevPos === null) newPos = (nextPos as number) - 1
    else if (nextPos === null) newPos = (prevPos as number) + 1
    else newPos = (prevPos + nextPos) / 2
    setTodos(prev => prev.map(t => t.id === moved.id ? { ...t, position: newPos } : t))
    await reorderTodo(supabase, moved.id, newPos)
  }

  // --- Detail dialog save ---
  async function saveDetail(task: Todo, payload: TaskDetailSave) {
    let recurrenceId: string | null = task.recurrence_id
    if (payload.recurrence.rrule) {
      const rec = await createRecurrence(supabase, {
        rrule: payload.recurrence.rrule,
        regenerate_on_complete: payload.recurrence.regenerateOnComplete,
      })
      setRecurrences(prev => [...prev, rec])
      if (task.recurrence_id) await deactivateRecurrence(supabase, task.recurrence_id)
      recurrenceId = rec.id
    } else if (task.recurrence_id) {
      await deactivateRecurrence(supabase, task.recurrence_id)
      recurrenceId = null
    }

    await updateTodo(supabase, task.id, {
      title: payload.title,
      notes: payload.notes,
      list_id: payload.list_id,
      due_at: payload.due_at,
      priority: payload.priority,
      recurrence_id: recurrenceId,
    })
    await setTaskTags(supabase, task.id, payload.tagIds)

    setTodos(prev => prev.map(t => t.id === task.id ? {
      ...t,
      title: payload.title,
      notes: payload.notes,
      list_id: payload.list_id,
      due_at: payload.due_at,
      priority: payload.priority,
      recurrence_id: recurrenceId,
    } : t))
    setTaskTagMap(prev => ({ ...prev, [task.id]: payload.tagIds }))
    setEditing(null)
  }

  async function addSubtask(parent: Todo, title: string) {
    const created = await createTodo(supabase, { title, parent_task_id: parent.id, list_id: parent.list_id ?? undefined })
    setTodos(prev => [...prev, created])
  }

  // --- Triage suggestions ---
  async function acceptTriage(task: Todo) {
    const s = task.triage_suggestion
    if (!s) return
    await updateTodo(supabase, task.id, {
      list_id: s.project_id ?? task.list_id,
      priority: s.priority ?? task.priority,
      due_at: s.due_at ?? task.due_at,
      triage_suggestion: null,
    })
    setTodos(prev => prev.map(t => t.id === task.id ? {
      ...t,
      list_id: s.project_id ?? t.list_id,
      priority: s.priority ?? t.priority,
      due_at: s.due_at ?? t.due_at,
      triage_suggestion: null,
    } : t))
  }
  async function dismissTriage(task: Todo) {
    await updateTodo(supabase, task.id, { triage_suggestion: null })
    setTodos(prev => prev.map(t => t.id === task.id ? { ...t, triage_suggestion: null } : t))
  }

  // --- Keyboard shortcuts ---
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (typing || editing) return
      if (e.key === 'n') { e.preventDefault(); quickAddRef.current?.focus() }
      else if (e.key === '/') { e.preventDefault(); setPaletteOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing])

  const parsedPreview = useMemo(() => (draft.trim() ? parseTodoInput(draft) : null), [draft])
  const previewProject = parsedPreview?.project
    ? lists.find(l => l.name.toLowerCase() === parsedPreview.project!.toLowerCase())
    : undefined

  const tasksDone = doneStream.length
  const tasksTotal = pinned.length + activeStream.length + doneStream.length

  const editingChildren = editing ? childrenOf(editing.id) : []
  const editingRecurrence = editing?.recurrence_id ? recurrences.find(r => r.id === editing.recurrence_id) ?? null : null

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
      {/* View switcher + project pills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {VIEWS.map(v => (
          <ViewPill key={v.id} active={view === v.id} onClick={() => setView(v.id)} icon={v.icon} label={v.label} />
        ))}
        {lists.map(l => (
          <ViewPill key={l.id} active={view === l.id} onClick={() => setView(l.id)} label={`${l.emoji} ${l.name.toUpperCase()}`} />
        ))}
      </div>

      {/* Tag filter bar */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map(t => (
            <button
              key={t.id}
              onClick={() => setFilterTagId(filterTagId === t.id ? null : t.id)}
              className="font-mono text-[10px] rounded-full px-2.5 py-1 transition-colors"
              style={{
                background: filterTagId === t.id ? t.color : 'transparent',
                color: filterTagId === t.id ? '#2C1F0E' : 'var(--iven-muted)',
                border: `1px solid ${filterTagId === t.id ? t.color : 'var(--iven-border)'}`,
              }}
            >
              #{t.name}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-3xl">
        <div className="rounded-[18px] pb-2" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mx-6 my-3 h-12 rounded-lg animate-pulse" style={{ background: 'var(--iven-grid)', opacity: 0.3 }} />
            ))
          ) : error ? (
            <div className="text-center py-12 font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>{error}</div>
          ) : tasksTotal === 0 ? (
            <div className="text-center py-12 font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>NO TASKS</div>
          ) : (
            <>
              {/* Focus (pinned) */}
              {pinned.length > 0 && (
                <>
                  <SectionLabel>FOCUS</SectionLabel>
                  {pinned.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      tags={tags}
                      tagIds={taskTagMap[task.id] ?? []}
                      childTasks={childrenOf(task.id)}
                      recurring={!!task.recurrence_id}
                      onToggle={() => toggle(task)}
                      onEdit={() => setEditing(task)}
                      onPin={() => togglePin(task)}
                      onRemove={() => remove(task.id)}
                      onAcceptTriage={() => acceptTriage(task)}
                      onDismissTriage={() => dismissTriage(task)}
                    />
                  ))}
                </>
              )}

              {/* Active stream (drag-reorderable) */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={activeStream.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {activeStream.map(task => (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      tags={tags}
                      tagIds={taskTagMap[task.id] ?? []}
                      childTasks={childrenOf(task.id)}
                      onToggle={() => toggle(task)}
                      onEdit={() => setEditing(task)}
                      onPin={() => togglePin(task)}
                      onRemove={() => remove(task.id)}
                      onAcceptTriage={() => acceptTriage(task)}
                      onDismissTriage={() => dismissTriage(task)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Done */}
              {doneStream.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  tags={tags}
                  tagIds={taskTagMap[task.id] ?? []}
                  childTasks={childrenOf(task.id)}
                  recurring={!!task.recurrence_id}
                  done
                  onToggle={() => toggle(task)}
                  onEdit={() => setEditing(task)}
                  onPin={() => togglePin(task)}
                  onRemove={() => remove(task.id)}
                />
              ))}
            </>
          )}

          {/* Quick add */}
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex items-center justify-center rounded-[6px] flex-shrink-0" style={{ width: 22, height: 22, border: '1px dashed var(--iven-grid)', color: 'var(--iven-muted)' }}>
              <Plus size={13} />
            </div>
            <input
              ref={quickAddRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Add a task…  (tomorrow 3pm #errands !p1 @SBS)"
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-inter"
              style={{ border: 'none', color: 'var(--iven-text)' }}
            />
            <button onClick={() => addTask()} className="font-mono text-[11px] tracking-[1.5px] font-semibold rounded-lg px-4 py-[10px]" style={{ background: 'var(--iven-accent)', color: '#2C1F0E', border: 'none', cursor: 'pointer' }}>
              ADD
            </button>
          </div>

          {/* Parsed preview chips */}
          {parsedPreview && (parsedPreview.hadDateToken || parsedPreview.priority > 0 || previewProject || parsedPreview.tags.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
              <span className="font-mono text-[9px] tracking-[1.5px]" style={{ color: 'var(--iven-muted)' }}>PARSED</span>
              {parsedPreview.dueAt && <Chip>{formatDue(parsedPreview.dueAt)}</Chip>}
              {parsedPreview.priority > 0 && <Chip>P{parsedPreview.priority}</Chip>}
              {previewProject && <Chip>{previewProject.emoji} {previewProject.name}</Chip>}
              {parsedPreview.tags.map(t => <Chip key={t}>#{t}</Chip>)}
            </div>
          )}
        </div>

        {pinWarning && (
          <div className="mt-3 font-mono text-[10px] tracking-[1px]" style={{ color: '#6B4F2A' }}>
            FOCUS HOLDS AT MOST {MAX_PINS} — UNPIN ONE FIRST
          </div>
        )}

        {notifyState === 'default' && (
          <button
            onClick={() => requestNotificationPermission().then(() => setNotifyState(getNotificationSupport()))}
            className="mt-3 font-mono text-[10px] tracking-[1.5px]"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--iven-muted)' }}
          >
            ENABLE DUE REMINDERS →
          </button>
        )}

        <WeeklyReview todos={todos} recurrences={recurrences} />
      </div>

      {editing && (
        <TaskDetailDialog
          task={editing}
          lists={lists}
          allTags={tags}
          taskTagIds={taskTagMap[editing.id] ?? []}
          subtasks={editingChildren}
          recurrence={editingRecurrence}
          onClose={() => setEditing(null)}
          onSave={payload => saveDetail(editing, payload)}
          onDelete={() => { remove(editing.id); setEditing(null) }}
          onCreateTag={async name => {
            const tag = await createTag(supabase, { name, color: '#C9A84C' })
            setTags(prev => [...prev, tag])
            return tag
          }}
          onAddSubtask={title => addSubtask(editing, title)}
          onToggleSubtask={child => toggle(child)}
        />
      )}

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        lists={lists}
        todos={todos}
        onAdd={title => addTask(title)}
        onJump={v => setView(v)}
        onSelectTask={t => setEditing(t)}
      />
    </IvenModule>
  )
}

function ViewPill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon?: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 font-mono text-[10px] tracking-[1.5px] px-3 py-[6px] rounded-lg transition-colors"
      style={{ background: active ? 'var(--iven-accent)' : 'transparent', color: active ? '#2C1F0E' : 'var(--iven-muted)', border: 'none', cursor: 'pointer' }}
    >
      {icon}{label}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 pt-4 pb-1 font-mono text-[9px] tracking-[2px]" style={{ color: 'var(--iven-accent)' }}>
      {children}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] rounded-full px-2 py-0.5" style={{ background: 'var(--iven-grid)', color: 'var(--iven-text)' }}>
      {children}
    </span>
  )
}

interface RowProps {
  task: Todo
  tags: Tag[]
  tagIds: string[]
  childTasks?: Todo[]
  recurring?: boolean
  done?: boolean
  dragHandle?: React.ReactNode
  onToggle: () => void
  onEdit: () => void
  onPin: () => void
  onRemove: () => void
  onAcceptTriage?: () => void
  onDismissTriage?: () => void
}

function TaskRow(props: RowProps) {
  const { task, tags, tagIds, done, recurring, dragHandle, onToggle, onEdit, onPin, onRemove, onAcceptTriage, onDismissTriage } = props
  const kids = props.childTasks ?? []
  const kidsDone = kids.filter(k => k.completed).length
  const pColor = priorityColor(task.priority)
  const rowTags = tags.filter(t => tagIds.includes(t.id))
  const suggestion = task.triage_suggestion

  return (
    <div style={{ borderBottom: '1px solid var(--iven-grid)' }}>
      <div className="flex items-center gap-3 px-6 py-4 group">
        {dragHandle}
        {pColor && !done && <span className="rounded-full flex-shrink-0" style={{ width: 4, height: 22, background: pColor }} />}
        <button
          onClick={onToggle}
          className="flex items-center justify-center rounded-[6px] flex-shrink-0"
          style={{ width: 22, height: 22, border: `1px solid ${done ? 'var(--iven-accent)' : 'var(--iven-grid)'}`, background: done ? 'var(--iven-accent)' : 'transparent', cursor: 'pointer' }}
        >
          {done && <Check size={13} strokeWidth={3.2} style={{ color: '#2C1F0E' }} />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
          <div className="flex items-center gap-2">
            <span className="text-[15px] truncate" style={{ color: done ? 'var(--iven-muted)' : (task.due_at && isOverdue(task.due_at) && !done ? '#6B4F2A' : 'var(--iven-text)'), textDecoration: done ? 'line-through' : 'none' }}>
              {task.title}
            </span>
            {recurring && <Repeat size={12} style={{ color: 'var(--iven-muted)', flexShrink: 0 }} />}
            {kids.length > 0 && (
              <span className="font-mono text-[10px] rounded-full px-1.5" style={{ background: 'var(--iven-grid)', color: 'var(--iven-muted)' }}>{kidsDone}/{kids.length}</span>
            )}
          </div>
          {rowTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {rowTags.map(t => (
                <span key={t.id} className="font-mono text-[9px] rounded-full px-1.5" style={{ color: t.color, border: `1px solid ${t.color}` }}>#{t.name}</span>
              ))}
            </div>
          )}
        </div>

        <span className="font-mono text-[12px] flex-shrink-0" style={{ color: 'var(--iven-muted)' }}>{metaFor(task)}</span>

        {!done && (
          <button onClick={onPin} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ background: 'none', border: 'none', cursor: 'pointer', color: task.pinned ? 'var(--iven-accent)' : 'var(--iven-muted)', padding: 2 }} title="Pin to Focus">
            <Pin size={14} fill={task.pinned ? 'currentColor' : 'none'} />
          </button>
        )}
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--iven-muted)', padding: 2 }}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Triage suggestion */}
      {suggestion && !done && (
        <div className="flex items-center gap-2 px-6 pb-3 -mt-1">
          <Sparkles size={12} style={{ color: 'var(--iven-accent)' }} />
          <span className="font-mono text-[10px] tracking-[0.5px]" style={{ color: 'var(--iven-muted)' }}>SUGGESTED</span>
          <button onClick={onAcceptTriage} className="font-mono text-[10px] rounded-full px-2 py-0.5" style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}>ACCEPT</button>
          <button onClick={onDismissTriage} className="font-mono text-[10px] rounded-full px-2 py-0.5" style={{ background: 'transparent', color: 'var(--iven-muted)', border: '1px solid var(--iven-border)' }}>DISMISS</button>
        </div>
      )}
    </div>
  )
}

function SortableTaskRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const handle = (
    <button {...attributes} {...listeners}
      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-grab"
      style={{ background: 'none', border: 'none', color: 'var(--iven-muted)', padding: 0 }} title="Drag to reorder">
      <GripVertical size={14} />
    </button>
  )
  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow {...props} recurring={!!props.task.recurrence_id} dragHandle={handle} />
    </div>
  )
}
