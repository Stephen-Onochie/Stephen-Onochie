import type { SupabaseClient } from '@supabase/supabase-js'
import type { Todo, TodoInsert, TodoList } from '@/types/todo'

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
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Todo[]) ?? []
}

export async function createList(
  supabase: SupabaseClient,
  list: { name: string; emoji: string; color: string; sort_order: number }
): Promise<TodoList> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('todo_lists')
    .insert({ ...list, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as TodoList
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
  patch: Partial<Pick<Todo, 'title' | 'notes' | 'due_at' | 'list_id' | 'completed' | 'completed_at'>>
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

export async function deleteTodo(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) throw error
}
