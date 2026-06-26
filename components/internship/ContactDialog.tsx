'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  createContact,
  updateContact,
  deleteContact,
} from '@/lib/internship/supabase'
import type {
  Contact,
  ContactSource,
  PipelineState,
  Application,
} from '@/types/internship'
import {
  CONTACT_SOURCE_LABELS,
  PIPELINE_LABELS,
} from '@/types/internship'
import { Button, Field, TextInput, TextArea, Select } from './ui'

const overlayStyle = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(20,16,12,0.55)',
  zIndex: 100,
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export default function ContactDialog({
  contact,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
  applications,
}: {
  contact: Contact | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved: (c: Contact) => void
  onDeleted: (id: string) => void
  applications: Application[]
}) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState<ContactSource>('cold')
  const [state, setState] = useState<PipelineState>('contacted')
  const [nextAction, setNextAction] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')
  const [linkedApp, setLinkedApp] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(contact?.name ?? '')
    setCompany(contact?.company ?? '')
    setRoleTitle(contact?.role_title ?? '')
    setLinkedin(contact?.linkedin_url ?? '')
    setEmail(contact?.email ?? '')
    setSource(contact?.source ?? 'cold')
    setState(contact?.pipeline_state ?? 'contacted')
    setNextAction(contact?.next_action ?? '')
    setNextActionDate(toDatetimeLocal(contact?.next_action_date ?? null))
    setLinkedApp(contact?.linked_application_id ?? '')
    setNotes(contact?.notes ?? '')
  }, [contact])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const fields = {
        name: name.trim(),
        company: company.trim() || null,
        role_title: roleTitle.trim() || null,
        linkedin_url: linkedin.trim() || null,
        email: email.trim() || null,
        source,
        pipeline_state: state,
        next_action: nextAction.trim() || null,
        next_action_date: nextActionDate ? new Date(nextActionDate).toISOString() : null,
        linked_application_id: linkedApp || null,
        notes: notes.trim() || null,
      }
      if (contact) {
        await updateContact(supabase, contact.id, fields)
        onSaved({ ...contact, ...fields })
      } else {
        const created = await createContact(supabase, fields)
        onSaved(created)
      }
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!contact) return
    if (!confirm(`Delete contact ${contact.name}?`)) return
    const supabase = createClient()
    await deleteContact(supabase, contact.id)
    onDeleted(contact.id)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] rounded-2xl p-6 w-[min(560px,94vw)] max-h-[92vh] overflow-y-auto"
          style={{
            background: 'var(--iven-surface)',
            border: '1px solid var(--iven-border)',
            boxShadow: '0 24px 60px rgba(20,16,12,0.4)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="font-playfair font-bold text-[22px]" style={{ color: 'var(--iven-text)' }}>
              {contact ? 'Edit Contact' : 'Add Contact'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" style={{ color: 'var(--iven-muted)' }}>
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *">
                <TextInput value={name} onChange={e => setName(e.target.value)} />
              </Field>
              <Field label="Company">
                <TextInput value={company} onChange={e => setCompany(e.target.value)} />
              </Field>
              <Field label="Role / Title">
                <TextInput value={roleTitle} onChange={e => setRoleTitle(e.target.value)} />
              </Field>
              <Field label="Email">
                <TextInput value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
            </div>

            <Field label="LinkedIn URL">
              <TextInput value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Source">
                <Select
                  value={source}
                  onChange={v => setSource(v as ContactSource)}
                  options={Object.entries(CONTACT_SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Pipeline State">
                <Select
                  value={state}
                  onChange={v => setState(v as PipelineState)}
                  options={Object.entries(PIPELINE_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Next Action">
                <TextInput value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Follow up, ask for referral…" />
              </Field>
              <Field label="Next Action Date">
                <TextInput type="datetime-local" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} />
              </Field>
            </div>

            <Field label="Linked Application">
              <Select
                value={linkedApp}
                onChange={setLinkedApp}
                options={[
                  { value: '', label: '— None —' },
                  ...applications.map(a => ({ value: a.id, label: `${a.company} — ${a.role_title}` })),
                ]}
              />
            </Field>

            <Field label="Notes">
              <TextArea value={notes} onChange={e => setNotes(e.target.value)} />
            </Field>

            <div className="flex justify-between items-center mt-2">
              {contact ? (
                <Button variant="danger" onClick={handleDelete}>
                  <span className="flex items-center gap-1.5"><Trash2 size={12} /> Delete</span>
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !name.trim()}>
                  {saving ? 'Saving…' : contact ? 'Save' : 'Add Contact'}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
