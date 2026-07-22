'use client'

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { CalendarDays, Inbox, Plus, Search } from 'lucide-react'
import type { Todo, TodoList, ViewId } from '@/types/todo'
import { useIvenDarkMode } from '@/components/iven/IvenDarkModeContext'

// ⌘K palette: add a task, search tasks, or jump to a project/view.
export default function CommandPalette({
  open,
  onOpenChange,
  lists,
  todos,
  onAdd,
  onJump,
  onSelectTask,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  lists: TodoList[]
  todos: Todo[]
  onAdd: (title: string) => void
  onJump: (view: ViewId) => void
  onSelectTask: (task: Todo) => void
}) {
  const { dark } = useIvenDarkMode()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const trimmed = search.trim()

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      data-iven-theme={dark ? 'dark' : 'light'}
      className="fixed left-1/2 top-[18vh] z-50 w-[92vw] max-w-lg -translate-x-1/2 rounded-[16px] overflow-hidden"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--iven-grid)' }}>
        <Search size={16} style={{ color: 'var(--iven-muted)' }} />
        <Command.Input
          autoFocus
          value={search}
          onValueChange={setSearch}
          placeholder="Add a task, search, or jump…"
          className="flex-1 bg-transparent outline-none text-[15px] font-inter"
          style={{ color: 'var(--iven-text)', border: 'none' }}
        />
      </div>
      <Command.List className="max-h-[50vh] overflow-y-auto py-2">
        <Command.Empty className="px-4 py-4 font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
          No matches.
        </Command.Empty>

        {trimmed && (
          <Command.Group>
            <Command.Item
              value={`add ${trimmed}`}
              onSelect={() => { onAdd(trimmed); onOpenChange(false) }}
              className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-inter cursor-pointer aria-selected:bg-[var(--iven-grid)]"
              style={{ color: 'var(--iven-text)' }}
            >
              <Plus size={15} style={{ color: 'var(--iven-accent)' }} />
              Add task “{trimmed}”
            </Command.Item>
          </Command.Group>
        )}

        <Command.Group heading="Jump">
          <PaletteRow value="today" label="Today" icon={<CalendarDays size={15} />} onSelect={() => { onJump('today'); onOpenChange(false) }} />
          <PaletteRow value="inbox" label="Inbox" icon={<Inbox size={15} />} onSelect={() => { onJump('inbox'); onOpenChange(false) }} />
          {lists.map(l => (
            <PaletteRow key={l.id} value={`project ${l.name}`} label={`${l.emoji} ${l.name}`} onSelect={() => { onJump(l.id); onOpenChange(false) }} />
          ))}
        </Command.Group>

        <Command.Group heading="Tasks">
          {todos.filter(t => !t.completed).slice(0, 40).map(t => (
            <PaletteRow key={t.id} value={`task ${t.title}`} label={t.title} onSelect={() => { onSelectTask(t); onOpenChange(false) }} />
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}

function PaletteRow({ value, label, icon, onSelect }: { value: string; label: string; icon?: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-inter cursor-pointer aria-selected:bg-[var(--iven-grid)]"
      style={{ color: 'var(--iven-text)' }}
    >
      <span style={{ color: 'var(--iven-muted)' }}>{icon}</span>
      {label}
    </Command.Item>
  )
}
