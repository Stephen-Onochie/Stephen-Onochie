'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Plus, Linkedin, Mail, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { moveContactState } from '@/lib/internship/supabase'
import type { Contact, PipelineState } from '@/types/internship'
import { PIPELINE_STATES, PIPELINE_LABELS, CONTACT_SOURCE_LABELS } from '@/types/internship'
import { isOverdue, formatShortDate } from '@/lib/internship/dates'
import { Pill, Button } from './ui'

function ContactCard({ contact, onOpen, dragging }: { contact: Contact; onOpen: () => void; dragging?: boolean }) {
  const overdue = isOverdue(contact.next_action_date)
  return (
    <div
      onClick={onOpen}
      className="rounded-xl p-3 cursor-pointer select-none"
      style={{
        background: 'var(--iven-surface)',
        border: `1px solid ${overdue ? '#A8743B' : 'var(--iven-grid)'}`,
        boxShadow: dragging ? '0 12px 28px rgba(20,16,12,0.3)' : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[14px] font-semibold leading-tight" style={{ color: 'var(--iven-text)' }}>
          {contact.name}
        </span>
        <div className="flex items-center gap-1.5">
          {contact.linkedin_url && <Linkedin size={12} style={{ color: 'var(--iven-muted)' }} />}
          {contact.email && <Mail size={12} style={{ color: 'var(--iven-muted)' }} />}
        </div>
      </div>
      {(contact.role_title || contact.company) && (
        <div className="text-[12px] leading-tight" style={{ color: 'var(--iven-muted)' }}>
          {[contact.role_title, contact.company].filter(Boolean).join(' · ')}
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Pill>{CONTACT_SOURCE_LABELS[contact.source]}</Pill>
      </div>
      {contact.next_action && (
        <div
          className="flex items-center gap-1 mt-2 text-[11px]"
          style={{ color: overdue ? '#A8743B' : 'var(--iven-muted)' }}
        >
          {overdue && <AlertCircle size={11} />}
          <span className="truncate">{contact.next_action}</span>
          {contact.next_action_date && (
            <span className="font-mono whitespace-nowrap">· {formatShortDate(contact.next_action_date)}</span>
          )}
        </div>
      )}
    </div>
  )
}

function DraggableContact({ contact, onOpen }: { contact: Contact; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: contact.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <ContactCard contact={contact} onOpen={onOpen} />
    </div>
  )
}

function Column({ state, contacts, onOpen }: { state: PipelineState; contacts: Contact[]; onOpen: (c: Contact) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: state })
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 268 }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="font-mono text-[10px] font-semibold tracking-[2px] uppercase" style={{ color: 'var(--iven-text)' }}>
          {PIPELINE_LABELS[state]}
        </span>
        <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--iven-muted)' }}>
          {contacts.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 rounded-xl p-2 flex-1"
        style={{
          background: isOver ? 'color-mix(in srgb, var(--iven-accent) 12%, var(--iven-bg))' : 'var(--iven-bg)',
          border: '1px solid var(--iven-grid)',
          minHeight: 120,
        }}
      >
        {contacts.map(c => (
          <DraggableContact key={c.id} contact={c} onOpen={() => onOpen(c)} />
        ))}
      </div>
    </div>
  )
}

export default function ContactsPipeline({
  contacts,
  onChange,
  onOpen,
  onAdd,
}: {
  contacts: Contact[]
  onChange: (contacts: Contact[]) => void
  onOpen: (c: Contact) => void
  onAdd: () => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const byState = useMemo(() => {
    const map: Record<PipelineState, Contact[]> = {
      contacted: [], replied: [], call_done: [], referred: [], dormant: [],
    }
    for (const c of contacts) map[c.pipeline_state].push(c)
    return map
  }, [contacts])

  const activeContact = contacts.find(c => c.id === activeId) ?? null

  function handleStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function handleEnd(e: DragEndEvent) {
    setActiveId(null)
    if (!e.over) return
    const toState = e.over.id as PipelineState
    const contact = contacts.find(c => c.id === e.active.id)
    if (!contact || contact.pipeline_state === toState) return

    onChange(contacts.map(c => (c.id === contact.id ? { ...c, pipeline_state: toState } : c)))
    try {
      const supabase = createClient()
      await moveContactState(supabase, contact, toState)
    } catch {
      onChange(contacts)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={onAdd}>
          <span className="flex items-center gap-1.5"><Plus size={13} /> Add Contact</span>
        </Button>
      </div>
      <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={handleEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STATES.map(state => (
            <Column key={state} state={state} contacts={byState[state]} onOpen={onOpen} />
          ))}
        </div>
        <DragOverlay>{activeContact && <ContactCard contact={activeContact} onOpen={() => {}} dragging />}</DragOverlay>
      </DndContext>
    </div>
  )
}
