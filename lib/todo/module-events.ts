import type { SupabaseClient } from '@supabase/supabase-js'
import type { Todo, TodoList, ModuleLink } from '@/types/todo'

// Loosely-coupled cross-module bus. Completing a task whose project is
// module-linked emits a module_events row; target modules (reading, fitness)
// consume it independently. Kept event-based so modules stay decoupled — we do
// NOT write directly into reading_sessions/Hevy here.

export async function emitCompletionEvent(
  supabase: SupabaseClient,
  todo: Todo,
  list: TodoList | undefined
): Promise<void> {
  const module = list?.module_link
  if (!module) return
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('module_events').insert({
    user_id: session.user.id,
    source_task_id: todo.id,
    module,
    event_type: 'task_completed',
    payload: { title: todo.title, list_id: todo.list_id, completed_at: new Date().toISOString() },
  })
}

// Where a module-linked task deep-links to on the target module.
export function moduleDeepLink(module: ModuleLink): string | null {
  switch (module) {
    case 'reading':
      return '/apps/reading'
    case 'fitness':
      return 'https://hevy.com'
    case 'finance':
      return null // no finance module yet
    default:
      return null
  }
}
