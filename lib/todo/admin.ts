import type { SupabaseClient } from '@supabase/supabase-js'
import type { Todo, TodoList, Recurrence } from '@/types/todo'
import { nextOccurrence } from '@/lib/todo/recurrence'

// Service-role Todo CRUD scoped to a single owner uid. Used by the Todo MCP
// tools and the nightly triage cron — machine-to-machine callers with no browser
// session, so RLS is bypassed and every query is explicitly filtered by user_id.
// TODO_USER_ID falls back to HEALTH_USER_ID (both are the site owner's uid).

export function todoUserId(): string {
  const id = process.env.TODO_USER_ID || process.env.HEALTH_USER_ID
  if (!id) throw new Error('TODO_USER_ID (or HEALTH_USER_ID) is not configured')
  return id
}

export async function adminListProjects(db: SupabaseClient): Promise<TodoList[]> {
  const { data, error } = await db
    .from('todo_lists')
    .select('*')
    .eq('user_id', todoUserId())
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data as TodoList[]) ?? []
}

export interface TaskListFilter {
  bucket?: 'today' | 'inbox'
  project?: string // project name or id
  status?: 'todo' | 'done'
  due_before?: string // ISO
  limit?: number
}

async function resolveProjectId(db: SupabaseClient, project?: string): Promise<string | null | undefined> {
  if (!project) return undefined
  const projects = await adminListProjects(db)
  const match = projects.find(
    p => p.id === project || p.name.toLowerCase() === project.toLowerCase()
  )
  if (!match) throw new Error(`Project not found: ${project}`)
  return match.id
}

export async function adminListTasks(
  db: SupabaseClient,
  filter: TaskListFilter = {}
): Promise<Todo[]> {
  let q = db.from('todos').select('*').eq('user_id', todoUserId())

  if (filter.status === 'done') q = q.eq('completed', true)
  else if (filter.status === 'todo') q = q.eq('completed', false)

  if (filter.bucket === 'inbox') q = q.is('list_id', null)
  if (filter.due_before) q = q.lte('due_at', filter.due_before)

  if (filter.project) {
    const pid = await resolveProjectId(db, filter.project)
    if (pid) q = q.eq('list_id', pid)
  }
  if (filter.bucket === 'today') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    q = q.gte('due_at', start.toISOString()).lte('due_at', end.toISOString())
  }

  q = q.order('due_at', { ascending: true, nullsFirst: false }).limit(filter.limit ?? 50)
  const { data, error } = await q
  if (error) throw error
  return (data as Todo[]) ?? []
}

export async function adminSearchTasks(db: SupabaseClient, query: string): Promise<Todo[]> {
  const { data, error } = await db
    .from('todos')
    .select('*')
    .eq('user_id', todoUserId())
    .ilike('title', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(25)
  if (error) throw error
  return (data as Todo[]) ?? []
}

export interface TaskAddInput {
  title: string
  due?: string | null
  priority?: number
  project?: string
  tags?: string[]
  recurrence?: string // RRULE
}

export async function adminAddTask(db: SupabaseClient, input: TaskAddInput): Promise<Todo> {
  const userId = todoUserId()
  const listId = input.project ? await resolveProjectId(db, input.project) : null

  let recurrenceId: string | null = null
  if (input.recurrence) {
    const next = nextOccurrence(input.recurrence)
    const { data: rec, error: recErr } = await db
      .from('recurrences')
      .insert({
        user_id: userId,
        rrule: input.recurrence,
        anchor_date: new Date().toISOString().slice(0, 10),
        regenerate_on_complete: true,
        next_occurrence: next ? next.toISOString() : null,
      })
      .select('id')
      .single()
    if (recErr) throw recErr
    recurrenceId = (rec as { id: string }).id
  }

  const { data, error } = await db
    .from('todos')
    .insert({
      user_id: userId,
      title: input.title,
      due_at: input.due ?? null,
      priority: input.priority ?? 0,
      list_id: listId ?? null,
      recurrence_id: recurrenceId,
      source: 'mcp',
    })
    .select('*')
    .single()
  if (error) throw error
  const task = data as Todo

  if (input.tags?.length) {
    await adminSetTags(db, task.id, input.tags)
  }
  return task
}

// Resolves tag names to ids (creating missing tags) and replaces the task's set.
async function adminSetTags(db: SupabaseClient, taskId: string, tagNames: string[]): Promise<void> {
  const userId = todoUserId()
  const tagIds: string[] = []
  for (const name of tagNames) {
    const { data: existing } = await db
      .from('tags')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', name)
      .maybeSingle()
    if (existing) {
      tagIds.push((existing as { id: string }).id)
    } else {
      const { data: created, error } = await db
        .from('tags')
        .insert({ user_id: userId, name, color: '#C9A84C' })
        .select('id')
        .single()
      if (error) throw error
      tagIds.push((created as { id: string }).id)
    }
  }
  await db.from('task_tags').delete().eq('task_id', taskId)
  if (tagIds.length) {
    await db
      .from('task_tags')
      .insert(tagIds.map(tag_id => ({ task_id: taskId, tag_id, user_id: userId })))
  }
}

// Completes by id, or by fuzzy title match if no id given. Regenerates the next
// occurrence for regenerate-on-complete recurrences.
export async function adminCompleteTask(
  db: SupabaseClient,
  ref: { task_id?: string; title?: string }
): Promise<Todo> {
  let task: Todo | null = null
  if (ref.task_id) {
    const { data } = await db.from('todos').select('*').eq('id', ref.task_id).maybeSingle()
    task = data as Todo | null
  } else if (ref.title) {
    const matches = await adminSearchTasks(db, ref.title)
    task = matches.find(t => !t.completed) ?? matches[0] ?? null
  }
  if (!task) throw new Error('Task not found')

  await db
    .from('todos')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', task.id)

  if (task.recurrence_id) {
    const { data: rec } = await db
      .from('recurrences')
      .select('*')
      .eq('id', task.recurrence_id)
      .maybeSingle()
    const recurrence = rec as Recurrence | null
    if (recurrence?.active && recurrence.regenerate_on_complete) {
      const from = task.due_at ? new Date(task.due_at) : new Date()
      const next = nextOccurrence(recurrence.rrule, from)
      if (next) {
        await db.from('todos').insert({
          user_id: todoUserId(),
          title: task.title,
          notes: task.notes,
          due_at: next.toISOString(),
          list_id: task.list_id,
          priority: task.priority,
          recurrence_id: task.recurrence_id,
          source: 'auto',
        })
        await db
          .from('recurrences')
          .update({ next_occurrence: next.toISOString() })
          .eq('id', recurrence.id)
      }
    }
  }

  return { ...task, completed: true }
}

export interface TaskUpdateInput {
  task_id: string
  title?: string
  notes?: string | null
  due?: string | null
  priority?: number
  pinned?: boolean
  project?: string
  completed?: boolean
}

export async function adminUpdateTask(db: SupabaseClient, input: TaskUpdateInput): Promise<Todo> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.due !== undefined) patch.due_at = input.due
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.pinned !== undefined) patch.pinned = input.pinned
  if (input.completed !== undefined) {
    patch.completed = input.completed
    patch.completed_at = input.completed ? new Date().toISOString() : null
  }
  if (input.project !== undefined) {
    patch.list_id = input.project ? await resolveProjectId(db, input.project) : null
  }

  const { data, error } = await db
    .from('todos')
    .update(patch)
    .eq('id', input.task_id)
    .eq('user_id', todoUserId())
    .select('*')
    .single()
  if (error) throw error
  return data as Todo
}
