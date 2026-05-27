'use client'

import { Trash2 } from 'lucide-react'
import type { TodoList, ViewId } from '@/types/todo'

interface ListSidebarProps {
  lists: TodoList[]
  activeView: ViewId
  counts: Record<string, number>
  todayCount: number
  inboxCount: number
  onSelect: (view: ViewId) => void
  onNewList: () => void
  onDeleteList: (id: string) => void
}

export default function ListSidebar({
  lists,
  activeView,
  counts,
  todayCount,
  inboxCount,
  onSelect,
  onNewList,
  onDeleteList,
}: ListSidebarProps) {
  function pill(view: ViewId, label: string, icon: string, count: number) {
    const active = activeView === view
    return (
      <button
        key={view}
        onClick={() => onSelect(view)}
        className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 font-inter text-sm transition-colors ${
          active
            ? 'border-gold bg-gold/20 text-brownAccent'
            : 'border-goldLight bg-surface text-textMuted hover:text-textPrimary'
        }`}
      >
        <span aria-hidden="true">{icon}</span>
        <span className="font-medium">{label}</span>
        {count > 0 && <span className="text-xs opacity-70">{count}</span>}
      </button>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {pill('today', 'Today', '⭐', todayCount)}
      {pill('inbox', 'Inbox', '📥', inboxCount)}
      {lists.map((list) => {
        const active = activeView === list.id
        return (
          <div key={list.id} className="group relative shrink-0">
            <button
              onClick={() => onSelect(list.id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 font-inter text-sm transition-colors ${
                active
                  ? 'border-gold bg-gold/20 text-brownAccent'
                  : 'border-goldLight bg-surface text-textMuted hover:text-textPrimary'
              }`}
            >
              <span aria-hidden="true">{list.emoji}</span>
              <span className="font-medium">{list.name}</span>
              {counts[list.id] > 0 && (
                <span className="text-xs opacity-70">{counts[list.id]}</span>
              )}
              {active && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Delete ${list.name} list`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete "${list.name}" and all its todos?`)) {
                      onDeleteList(list.id)
                    }
                  }}
                  className="ml-1 text-textMuted hover:text-red-700"
                >
                  <Trash2 size={14} />
                </span>
              )}
            </button>
          </div>
        )
      })}
      <button
        onClick={onNewList}
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-grid px-4 py-2 font-inter text-sm text-textMuted hover:border-brownAccent hover:text-brownAccent"
      >
        + New list
      </button>
    </div>
  )
}
