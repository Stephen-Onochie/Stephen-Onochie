'use client'

import { Trash2 } from 'lucide-react'
import type { Todo } from '@/types/todo'
import { formatDue, isOverdue } from '@/lib/todo/parse'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const overdue = todo.due_at && !todo.completed && isOverdue(todo.due_at)

  return (
    <div className="group flex items-start gap-3 bg-surface border border-goldLight rounded-2xl px-4 py-3">
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-colors ${
          todo.completed
            ? 'border-gold bg-gold'
            : 'border-grid hover:border-brownAccent'
        }`}
      >
        {todo.completed && (
          <span className="block text-white text-xs leading-4 text-center">✓</span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`font-inter text-sm ${
            todo.completed
              ? 'text-textMuted line-through'
              : 'text-textPrimary'
          }`}
        >
          {todo.title}
        </p>
        {todo.due_at && (
          <p
            className={`mt-0.5 font-inter text-xs ${
              overdue ? 'text-red-700' : 'text-textMuted'
            }`}
          >
            {overdue ? '⚠ ' : '📅 '}
            {formatDue(todo.due_at)}
          </p>
        )}
      </div>

      <button
        onClick={() => onDelete(todo.id)}
        aria-label="Delete todo"
        className="shrink-0 text-textMuted opacity-0 transition-opacity hover:text-red-700 group-hover:opacity-100"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
