export interface TodoList {
  id: string
  user_id: string
  name: string
  emoji: string
  color: string
  sort_order: number
  created_at: string
}

export interface Todo {
  id: string
  user_id: string
  list_id: string | null
  title: string
  notes: string | null
  due_at: string | null
  completed: boolean
  completed_at: string | null
  sort_order: number
  created_at: string
}

export interface TodoInsert {
  list_id?: string | null
  title: string
  notes?: string | null
  due_at?: string | null
}

// The Inbox is a virtual list (todos with list_id = null) plus the
// "Today" smart view. Custom lists are real rows keyed by their id.
export type ViewId = 'today' | 'inbox' | string
