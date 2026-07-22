'use client'

import { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, Plus, Trash2 } from 'lucide-react'
import type { Todo, TodoList, Tag, Recurrence } from '@/types/todo'
import RecurrenceEditor, { type RecurrenceValue } from '@/components/todo/RecurrenceEditor'
import { useIvenDarkMode } from '@/components/iven/IvenDarkModeContext'

export interface TaskDetailSave {
  title: string
  notes: string | null
  list_id: string | null
  due_at: string | null
  priority: number
  tagIds: string[]
  recurrence: RecurrenceValue
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function localInputToIso(local: string): string | null {
  if (!local) return null
  return new Date(local).toISOString()
}

const PRIORITIES = [
  { v: 0, label: 'None' },
  { v: 1, label: 'P1' },
  { v: 2, label: 'P2' },
  { v: 3, label: 'P3' },
]

export default function TaskDetailDialog({
  task,
  lists,
  allTags,
  taskTagIds,
  subtasks,
  recurrence,
  onClose,
  onSave,
  onDelete,
  onCreateTag,
  onAddSubtask,
  onToggleSubtask,
}: {
  task: Todo
  lists: TodoList[]
  allTags: Tag[]
  taskTagIds: string[]
  subtasks: Todo[]
  recurrence: Recurrence | null
  onClose: () => void
  onSave: (payload: TaskDetailSave) => void
  onDelete: () => void
  onCreateTag: (name: string) => Promise<Tag>
  onAddSubtask: (title: string) => void
  onToggleSubtask: (child: Todo) => void
}) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [listId, setListId] = useState<string | null>(task.list_id)
  const [due, setDue] = useState(isoToLocalInput(task.due_at))
  const [priority, setPriority] = useState(task.priority)
  const [tagIds, setTagIds] = useState<string[]>(taskTagIds)
  const [newTag, setNewTag] = useState('')
  const [subtaskDraft, setSubtaskDraft] = useState('')
  const [rec, setRec] = useState<RecurrenceValue>({
    rrule: recurrence?.rrule ?? null,
    regenerateOnComplete: recurrence?.regenerate_on_complete ?? true,
  })

  const { dark } = useIvenDarkMode()
  const doneChildren = useMemo(() => subtasks.filter(s => s.completed).length, [subtasks])

  function toggleTag(id: string) {
    setTagIds(prev => (prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]))
  }

  async function addTag() {
    const name = newTag.trim().replace(/^#/, '')
    if (!name) return
    const existing = allTags.find(t => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!tagIds.includes(existing.id)) toggleTag(existing.id)
    } else {
      const created = await onCreateTag(name)
      setTagIds(prev => [...prev, created.id])
    }
    setNewTag('')
  }

  function save() {
    onSave({
      title: title.trim() || task.title,
      notes: notes.trim() || null,
      list_id: listId,
      due_at: localInputToIso(due),
      priority,
      tagIds,
      recurrence: rec,
    })
  }

  return (
    <Dialog.Root open onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.4)' }} />
        <Dialog.Content
          data-iven-theme={dark ? 'dark' : 'light'}
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[18px] p-6 max-h-[88vh] overflow-y-auto"
          style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
        >
          <Dialog.Title className="font-playfair text-lg mb-4" style={{ color: 'var(--iven-text)' }}>
            Edit task
          </Dialog.Title>

          <div className="flex flex-col gap-4">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="rounded-lg px-3 py-2 text-[15px] font-inter outline-none"
              style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
            />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes…"
              rows={3}
              className="rounded-lg px-3 py-2 text-[13px] font-inter outline-none resize-none"
              style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] tracking-[1.5px]" style={{ color: 'var(--iven-muted)' }}>PROJECT</label>
                <select
                  value={listId ?? ''}
                  onChange={e => setListId(e.target.value || null)}
                  className="rounded-lg px-3 py-2 text-[13px] font-inter outline-none"
                  style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
                >
                  <option value="">Inbox</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] tracking-[1.5px]" style={{ color: 'var(--iven-muted)' }}>PRIORITY</label>
                <select
                  value={priority}
                  onChange={e => setPriority(parseInt(e.target.value, 10))}
                  className="rounded-lg px-3 py-2 text-[13px] font-inter outline-none"
                  style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
                >
                  {PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] tracking-[1.5px]" style={{ color: 'var(--iven-muted)' }}>DUE</label>
              <input
                type="datetime-local"
                value={due}
                onChange={e => setDue(e.target.value)}
                className="rounded-lg px-3 py-2 text-[13px] font-inter outline-none"
                style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] tracking-[1.5px]" style={{ color: 'var(--iven-muted)' }}>TAGS</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTag(t.id)}
                    className="font-mono text-[11px] rounded-full px-3 py-1 transition-colors"
                    style={{
                      background: tagIds.includes(t.id) ? t.color : 'transparent',
                      color: tagIds.includes(t.id) ? '#2C1F0E' : 'var(--iven-muted)',
                      border: `1px solid ${tagIds.includes(t.id) ? t.color : 'var(--iven-border)'}`,
                    }}
                  >
                    #{t.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="New tag…"
                  className="flex-1 rounded-lg px-3 py-1.5 text-[12px] font-inter outline-none"
                  style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
                />
                <button onClick={addTag} className="font-mono text-[10px] tracking-[1px] rounded-lg px-3" style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}>ADD</button>
              </div>
            </div>

            <RecurrenceEditor value={rec} onChange={setRec} />

            {/* Subtasks */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] tracking-[1.5px]" style={{ color: 'var(--iven-muted)' }}>
                SUBTASKS {subtasks.length > 0 && `· ${doneChildren}/${subtasks.length}`}
              </label>
              {subtasks.map(s => (
                <button
                  key={s.id}
                  onClick={() => onToggleSubtask(s)}
                  className="flex items-center gap-2 text-left text-[13px] font-inter"
                  style={{ color: s.completed ? 'var(--iven-muted)' : 'var(--iven-text)' }}
                >
                  <span className="flex items-center justify-center rounded-[5px] flex-shrink-0"
                    style={{ width: 18, height: 18, border: `1px solid ${s.completed ? 'var(--iven-accent)' : 'var(--iven-grid)'}`, background: s.completed ? 'var(--iven-accent)' : 'transparent' }}>
                    {s.completed && <Check size={11} strokeWidth={3.2} style={{ color: '#2C1F0E' }} />}
                  </span>
                  <span style={{ textDecoration: s.completed ? 'line-through' : 'none' }}>{s.title}</span>
                </button>
              ))}
              <div className="flex gap-2">
                <input
                  value={subtaskDraft}
                  onChange={e => setSubtaskDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && subtaskDraft.trim()) {
                      onAddSubtask(subtaskDraft.trim())
                      setSubtaskDraft('')
                    }
                  }}
                  placeholder="Add subtask…"
                  className="flex-1 rounded-lg px-3 py-1.5 text-[12px] font-inter outline-none"
                  style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
                />
                <button
                  onClick={() => { if (subtaskDraft.trim()) { onAddSubtask(subtaskDraft.trim()); setSubtaskDraft('') } }}
                  className="flex items-center justify-center rounded-lg px-2" style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-muted)' }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button onClick={onDelete} className="flex items-center gap-1 font-mono text-[10px] tracking-[1px]" style={{ color: 'var(--iven-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={13} /> DELETE
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="font-mono text-[10px] tracking-[1.5px] rounded-lg px-4 py-2" style={{ background: 'transparent', color: 'var(--iven-muted)', border: '1px solid var(--iven-border)' }}>CANCEL</button>
                <button onClick={save} className="font-mono text-[10px] tracking-[1.5px] font-semibold rounded-lg px-4 py-2" style={{ background: 'var(--iven-accent)', color: '#2C1F0E', border: 'none' }}>SAVE</button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
