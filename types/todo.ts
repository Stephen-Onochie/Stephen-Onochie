export type ModuleLink = 'reading' | 'fitness' | 'finance'

export interface TodoList {
  id: string
  user_id: string
  name: string
  emoji: string
  color: string
  icon: string | null
  module_link: ModuleLink | null
  sort_order: number
  created_at: string
}

export type TodoSource = 'manual' | 'quick_add' | 'mcp' | 'auto'

export interface Todo {
  id: string
  user_id: string
  list_id: string | null
  title: string
  notes: string | null
  due_at: string | null
  completed: boolean
  completed_at: string | null
  priority: number // 0=none, 1=P1, 2=P2, 3=P3
  pinned: boolean
  position: number | null
  parent_task_id: string | null
  recurrence_id: string | null
  source: TodoSource
  triage_suggestion: TriageSuggestion | null
  sort_order: number
  created_at: string
  updated_at?: string
}

export interface TriageSuggestion {
  project_id?: string | null
  priority?: number | null
  due_at?: string | null
}

export interface TodoInsert {
  list_id?: string | null
  title: string
  notes?: string | null
  due_at?: string | null
  priority?: number
  pinned?: boolean
  position?: number | null
  parent_task_id?: string | null
  recurrence_id?: string | null
  source?: TodoSource
}

export interface Tag {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface TaskTag {
  task_id: string
  tag_id: string
  user_id: string
  created_at: string
}

export interface Recurrence {
  id: string
  user_id: string
  rrule: string
  anchor_date: string
  regenerate_on_complete: boolean
  next_occurrence: string | null
  active: boolean
  created_at: string
}

export interface RecurrenceInsert {
  rrule: string
  anchor_date?: string
  regenerate_on_complete?: boolean
  next_occurrence?: string | null
}

// The Inbox is a virtual list (todos with list_id = null) plus the
// "Today" smart view. Custom lists are real rows keyed by their id.
export type ViewId = 'today' | 'inbox' | string
