import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Todo,
  TodoInsert,
  TodoList,
  Tag,
  Recurrence,
  RecurrenceInsert,
} from '@/types/todo'
import { nextOccurrence } from '@/lib/todo/recurrence'

const LIST_COLORS = [
  '#C9A84C',
  '#6B4F2A',
  '#8C7355',
  '#A8743B',
  '#7C8C5A',
  '#5A7C8C',
]

export function nextListColor(existing: TodoList[]): string {
  return LIST_COLORS[existing.length % LIST_COLORS.length]
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')
  return session.user.id
}

export async function fetchLists(supabase: SupabaseClient): Promise<TodoList[]> {
  const { data, error } = await supabase
    .from('todo_lists')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as TodoList[]) ?? []
}

export async function fetchTodos(supabase: SupabaseClient): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Todo[]) ?? []
}

export async function createList(
  supabase: SupabaseClient,
  list: {
    name: string
    emoji: string
    color: string
    sort_order: number
    icon?: string | null
    module_link?: TodoList['module_link']
  }
): Promise<TodoList> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('todo_lists')
    .insert({
      name: list.name,
      emoji: list.emoji,
      color: list.color,
      sort_order: list.sort_order,
      icon: list.icon ?? null,
      module_link: list.module_link ?? null,
      user_id: userId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as TodoList
}

export async function updateList(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<TodoList, 'name' | 'emoji' | 'color' | 'icon' | 'module_link' | 'sort_order'>>
): Promise<void> {
  const { error } = await supabase.from('todo_lists').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteList(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  // todos cascade-delete via the FK on list_id.
  const { error } = await supabase.from('todo_lists').delete().eq('id', id)
  if (error) throw error
}

export async function createTodo(
  supabase: SupabaseClient,
  item: TodoInsert
): Promise<Todo> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('todos')
    .insert({
      title: item.title,
      notes: item.notes ?? null,
      due_at: item.due_at ?? null,
      list_id: item.list_id ?? null,
      priority: item.priority ?? 0,
      pinned: item.pinned ?? false,
      position: item.position ?? null,
      parent_task_id: item.parent_task_id ?? null,
      recurrence_id: item.recurrence_id ?? null,
      source: item.source ?? 'manual',
      user_id: userId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Todo
}

export async function updateTodo(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<
    Pick<
      Todo,
      | 'title'
      | 'notes'
      | 'due_at'
      | 'list_id'
      | 'completed'
      | 'completed_at'
      | 'priority'
      | 'pinned'
      | 'position'
      | 'parent_task_id'
      | 'recurrence_id'
      | 'triage_suggestion'
    >
  >
): Promise<void> {
  const { error } = await supabase.from('todos').update(patch).eq('id', id)
  if (error) throw error
}

export async function setTodoCompleted(
  supabase: SupabaseClient,
  id: string,
  completed: boolean
): Promise<void> {
  await updateTodo(supabase, id, {
    completed,
    completed_at: completed ? new Date().toISOString() : null,
  })
}

export async function setPinned(
  supabase: SupabaseClient,
  id: string,
  pinned: boolean
): Promise<void> {
  await updateTodo(supabase, id, { pinned })
}

export async function reorderTodo(
  supabase: SupabaseClient,
  id: string,
  position: number
): Promise<void> {
  await updateTodo(supabase, id, { position })
}

export async function deleteTodo(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) throw error
}

// Completes a task and, if it belongs to a regenerate-on-complete recurrence,
// spawns the next occurrence. Returns the newly-created follow-up todo (if any)
// so the caller can splice it into local state optimistically.
export async function completeTodo(
  supabase: SupabaseClient,
  todo: Todo
): Promise<Todo | null> {
  await setTodoCompleted(supabase, todo.id, true)
  if (!todo.recurrence_id) return null

  const { data: rec } = await supabase
    .from('recurrences')
    .select('*')
    .eq('id', todo.recurrence_id)
    .maybeSingle()
  const recurrence = rec as Recurrence | null
  if (!recurrence || !recurrence.active || !recurrence.regenerate_on_complete) return null

  const from = todo.due_at ? new Date(todo.due_at) : new Date()
  const next = nextOccurrence(recurrence.rrule, from)
  if (!next) return null

  const clone = await createTodo(supabase, {
    title: todo.title,
    notes: todo.notes ?? undefined,
    due_at: next.toISOString(),
    list_id: todo.list_id ?? undefined,
    priority: todo.priority,
    recurrence_id: todo.recurrence_id,
    parent_task_id: todo.parent_task_id ?? undefined,
    source: 'auto',
  })

  await supabase
    .from('recurrences')
    .update({ next_occurrence: next.toISOString() })
    .eq('id', recurrence.id)

  // Carry the tags over to the new occurrence.
  const tagIds = await fetchTaskTagIds(supabase, todo.id)
  if (tagIds.length) await setTaskTags(supabase, clone.id, tagIds)

  return clone
}

// --- Tags --------------------------------------------------------------------

export async function fetchTags(supabase: SupabaseClient): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return (data as Tag[]) ?? []
}

export async function createTag(
  supabase: SupabaseClient,
  tag: { name: string; color: string }
): Promise<Tag> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('tags')
    .insert({ name: tag.name, color: tag.color, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as Tag
}

// Map of task_id -> tag_id[] for all of the user's tagged tasks.
export async function fetchTaskTagMap(
  supabase: SupabaseClient
): Promise<Record<string, string[]>> {
  const { data, error } = await supabase.from('task_tags').select('task_id, tag_id')
  if (error) throw error
  const map: Record<string, string[]> = {}
  for (const row of (data as { task_id: string; tag_id: string }[]) ?? []) {
    ;(map[row.task_id] ??= []).push(row.tag_id)
  }
  return map
}

async function fetchTaskTagIds(
  supabase: SupabaseClient,
  taskId: string
): Promise<string[]> {
  const { data } = await supabase.from('task_tags').select('tag_id').eq('task_id', taskId)
  return ((data as { tag_id: string }[]) ?? []).map(r => r.tag_id)
}

// Replaces the full tag set on a task.
export async function setTaskTags(
  supabase: SupabaseClient,
  taskId: string,
  tagIds: string[]
): Promise<void> {
  const userId = await requireUserId(supabase)
  await supabase.from('task_tags').delete().eq('task_id', taskId)
  if (!tagIds.length) return
  const rows = tagIds.map(tag_id => ({ task_id: taskId, tag_id, user_id: userId }))
  const { error } = await supabase.from('task_tags').insert(rows)
  if (error) throw error
}

// --- Recurrences -------------------------------------------------------------

export async function fetchRecurrences(supabase: SupabaseClient): Promise<Recurrence[]> {
  const { data, error } = await supabase.from('recurrences').select('*').eq('active', true)
  if (error) throw error
  return (data as Recurrence[]) ?? []
}

export async function createRecurrence(
  supabase: SupabaseClient,
  rec: RecurrenceInsert
): Promise<Recurrence> {
  const userId = await requireUserId(supabase)
  const next = nextOccurrence(rec.rrule)
  const { data, error } = await supabase
    .from('recurrences')
    .insert({
      rrule: rec.rrule,
      anchor_date: rec.anchor_date ?? new Date().toISOString().slice(0, 10),
      regenerate_on_complete: rec.regenerate_on_complete ?? true,
      next_occurrence: rec.next_occurrence ?? (next ? next.toISOString() : null),
      user_id: userId,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Recurrence
}

export async function deactivateRecurrence(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('recurrences').update({ active: false }).eq('id', id)
  if (error) throw error
}
