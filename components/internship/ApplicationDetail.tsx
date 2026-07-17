'use client'

import { useState, useEffect, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Trash2, Plus, ExternalLink, Calendar, Flag, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  updateApplication,
  deleteApplication,
  fetchActivity,
  fetchDocuments,
  createDocument,
  deleteDocument,
  createInterview,
  fetchInterviews,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchContacts,
  updateContact,
} from '@/lib/internship/supabase'
import type {
  Application,
  ActivityEvent,
  InternshipDocument,
  Interview,
  InterviewType,
  Task,
  Contact,
  Stage,
  Lane,
  CityTag,
  RoleType,
  Priority,
  ReferralStatus,
  ClosedReason,
} from '@/types/internship'
import {
  STAGE_LABELS,
  LANE_LABELS,
  CITY_LABELS,
  ROLE_TYPE_LABELS,
  PRIORITY_LABELS,
  REFERRAL_LABELS,
  INTERVIEW_TYPE_LABELS,
} from '@/types/internship'
import { formatDateTime, formatShortDate, daysUntil } from '@/lib/internship/dates'
import { Button, Field, TextInput, TextArea, Select, LaneBadge, Pill } from './ui'

const overlayStyle = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(20,16,12,0.55)',
  zIndex: 100,
}

type TabKey = 'overview' | 'timeline' | 'contacts' | 'interviews' | 'documents' | 'tasks'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'documents', label: 'Documents' },
  { key: 'tasks', label: 'Tasks' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[10px] font-semibold tracking-[2px] uppercase mb-3"
      style={{ color: 'var(--iven-accent)' }}
    >
      {children}
    </div>
  )
}

export default function ApplicationDetail({
  application,
  open,
  onOpenChange,
  onChange,
  onDeleted,
}: {
  application: Application | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onChange: (app: Application) => void
  onDeleted: (id: string) => void
}) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [local, setLocal] = useState<Application | null>(application)

  useEffect(() => {
    setLocal(application)
    setTab('overview')
  }, [application])

  const supabase = createClient()

  const patch = useCallback(
    async (p: Partial<Application>) => {
      if (!local) return
      const next = { ...local, ...p }
      setLocal(next)
      onChange(next)
      await updateApplication(supabase, local.id, p)
    },
    [local, onChange, supabase]
  )

  if (!local) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] rounded-2xl w-[min(720px,94vw)] max-h-[92vh] flex flex-col overflow-hidden"
          style={{
            background: 'var(--iven-surface)',
            border: '1px solid var(--iven-border)',
            boxShadow: '0 24px 60px rgba(20,16,12,0.4)',
          }}
        >
          {/* Header */}
          <div
            className="p-6 pb-4 flex items-start justify-between gap-4"
            style={{ borderBottom: '1px solid var(--iven-grid)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <LaneBadge lane={local.lane} />
                {local.deadline && (
                  <Pill color={daysUntil(local.deadline) <= 7 ? '#A8743B' : 'var(--iven-muted)'}>
                    <Calendar size={9} className="inline mr-1" />
                    {daysUntil(local.deadline)}d
                  </Pill>
                )}
              </div>
              <Dialog.Title
                className="font-playfair font-bold text-[24px] leading-tight"
                style={{ color: 'var(--iven-text)' }}
              >
                {local.company}
              </Dialog.Title>
              <div className="text-[14px]" style={{ color: 'var(--iven-muted)' }}>
                {local.role_title}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {local.job_url && (
                <a
                  href={local.job_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--iven-muted)' }}
                  title="Open job posting"
                >
                  <ExternalLink size={18} />
                </a>
              )}
              <Dialog.Close asChild>
                <button aria-label="Close" style={{ color: 'var(--iven-muted)' }}>
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-3" style={{ borderBottom: '1px solid var(--iven-grid)' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="font-mono text-[10px] font-semibold tracking-[1.5px] uppercase px-3 py-2 transition-colors"
                style={{
                  color: tab === t.key ? 'var(--iven-text)' : 'var(--iven-muted)',
                  borderBottom: `2px solid ${tab === t.key ? 'var(--iven-accent)' : 'transparent'}`,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {tab === 'overview' && <OverviewTab app={local} patch={patch} onDeleted={onDeleted} onClose={() => onOpenChange(false)} />}
            {tab === 'timeline' && <TimelineTab applicationId={local.id} />}
            {tab === 'contacts' && <ContactsTab application={local} />}
            {tab === 'interviews' && <InterviewsTab application={local} />}
            {tab === 'documents' && <DocumentsTab applicationId={local.id} />}
            {tab === 'tasks' && <TasksTab applicationId={local.id} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Overview ────────────────────────────────────────────────────────────────
function OverviewTab({
  app,
  patch,
  onDeleted,
  onClose,
}: {
  app: Application
  patch: (p: Partial<Application>) => Promise<void>
  onDeleted: (id: string) => void
  onClose: () => void
}) {
  const supabase = createClient()
  const [generatingBio, setGeneratingBio] = useState(false)
  const [notesVersion, setNotesVersion] = useState(0)

  async function handleDelete() {
    if (!confirm(`Delete ${app.company} — ${app.role_title}? This cannot be undone.`)) return
    await deleteApplication(supabase, app.id)
    onDeleted(app.id)
    onClose()
  }

  async function generateBio() {
    setGeneratingBio(true)
    try {
      const res = await fetch('/api/internship/company-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: app.company, role_title: app.role_title }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Bio generation failed')
        return
      }
      const existing = app.notes?.trim()
      const merged = existing ? `${existing}\n\n${data.notes}` : data.notes
      await patch({ notes: merged })
      setNotesVersion(v => v + 1) // remount TextArea so the new notes show
    } catch {
      alert('Bio generation failed')
    } finally {
      setGeneratingBio(false)
    }
  }

  function toDatetimeLocal(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    const off = d.getTimezoneOffset()
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Company">
          <TextInput defaultValue={app.company} onBlur={e => patch({ company: e.target.value })} />
        </Field>
        <Field label="Role">
          <TextInput defaultValue={app.role_title} onBlur={e => patch({ role_title: e.target.value })} />
        </Field>
        <Field label="Stage">
          <Select
            value={app.stage}
            onChange={v => patch({ stage: v as Stage })}
            options={Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Priority">
          <Select
            value={app.priority}
            onChange={v => patch({ priority: v as Priority })}
            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Lane">
          <Select
            value={app.lane}
            onChange={v => patch({ lane: v as Lane })}
            options={Object.entries(LANE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="City">
          <Select
            value={app.city_tag}
            onChange={v => patch({ city_tag: v as CityTag })}
            options={Object.entries(CITY_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Role Type">
          <Select
            value={app.role_type}
            onChange={v => patch({ role_type: v as RoleType })}
            options={Object.entries(ROLE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Referral Status">
          <Select
            value={app.referral_status}
            onChange={v => patch({ referral_status: v as ReferralStatus })}
            options={Object.entries(REFERRAL_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </Field>
        <Field label="Location">
          <TextInput defaultValue={app.location ?? ''} onBlur={e => patch({ location: e.target.value || null })} />
        </Field>
        <Field label="Job URL">
          <TextInput defaultValue={app.job_url ?? ''} onBlur={e => patch({ job_url: e.target.value || null })} />
        </Field>
        <Field label="Deadline">
          <TextInput
            type="datetime-local"
            defaultValue={toDatetimeLocal(app.deadline)}
            onBlur={e => patch({ deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
          />
        </Field>
        {app.stage === 'closed' && (
          <Field label="Closed Reason">
            <Select
              value={app.closed_reason ?? 'rejected'}
              onChange={v => patch({ closed_reason: v as ClosedReason })}
              options={[
                { value: 'rejected', label: 'Rejected' },
                { value: 'withdrawn', label: 'Withdrawn' },
                { value: 'ghosted', label: 'Ghosted' },
                { value: 'accepted_other', label: 'Accepted Other' },
              ]}
            />
          </Field>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={app.is_paid_confirmed}
          onChange={e => patch({ is_paid_confirmed: e.target.checked })}
        />
        <span className="text-[13px] flex items-center gap-1.5" style={{ color: 'var(--iven-text)' }}>
          {!app.is_paid_confirmed && <Flag size={13} style={{ color: '#A8743B' }} />}
          Paid position confirmed
        </span>
      </label>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-[9px] font-semibold tracking-[1.5px] uppercase"
            style={{ color: 'var(--iven-muted)' }}
          >
            Notes
          </span>
          <Button variant="ghost" onClick={generateBio} disabled={generatingBio}>
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} /> {generatingBio ? 'Generating…' : 'Generate bio'}
            </span>
          </Button>
        </div>
        <TextArea
          key={notesVersion}
          defaultValue={app.notes ?? ''}
          onBlur={e => patch({ notes: e.target.value || null })}
          style={{ minHeight: 120 }}
        />
      </div>

      <div className="flex justify-end pt-2" style={{ borderTop: '1px solid var(--iven-grid)' }}>
        <Button variant="danger" onClick={handleDelete}>
          <span className="flex items-center gap-1.5">
            <Trash2 size={12} /> Delete
          </span>
        </Button>
      </div>
    </div>
  )
}

// ── Timeline ────────────────────────────────────────────────────────────────
function TimelineTab({ applicationId }: { applicationId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  useEffect(() => {
    const supabase = createClient()
    fetchActivity(supabase, applicationId).then(setEvents)
  }, [applicationId])

  if (events.length === 0) {
    return <Empty>No activity yet.</Empty>
  }

  return (
    <div className="flex flex-col gap-0">
      {events.map((e, i) => (
        <div key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="rounded-full" style={{ width: 9, height: 9, background: 'var(--iven-accent)', marginTop: 4 }} />
            {i < events.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--iven-grid)' }} />}
          </div>
          <div className="pb-4 flex-1">
            <div className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
              {e.description}
            </div>
            <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--iven-muted)' }}>
              {formatDateTime(e.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Contacts ────────────────────────────────────────────────────────────────
function ContactsTab({ application }: { application: Application }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const supabase = createClient()

  const load = useCallback(() => {
    fetchContacts(supabase).then(all =>
      setContacts(all.filter(c => c.linked_application_id === application.id))
    )
  }, [application.id, supabase])

  useEffect(load, [load])

  const [linkOpen, setLinkOpen] = useState(false)
  const [allContacts, setAllContacts] = useState<Contact[]>([])

  async function openLink() {
    const all = await fetchContacts(supabase)
    setAllContacts(all.filter(c => c.linked_application_id !== application.id))
    setLinkOpen(true)
  }

  async function link(id: string) {
    await updateContact(supabase, id, { linked_application_id: application.id })
    setLinkOpen(false)
    load()
  }

  async function unlink(id: string) {
    await updateContact(supabase, id, { linked_application_id: null })
    load()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <SectionLabel>Linked Contacts</SectionLabel>
        <Button variant="ghost" onClick={openLink}>
          <span className="flex items-center gap-1.5"><Plus size={12} /> Link</span>
        </Button>
      </div>
      {contacts.length === 0 && <Empty>No linked contacts.</Empty>}
      {contacts.map(c => (
        <Row key={c.id}>
          <div className="flex-1">
            <div className="text-[13px] font-medium" style={{ color: 'var(--iven-text)' }}>{c.name}</div>
            <div className="text-[11px]" style={{ color: 'var(--iven-muted)' }}>
              {[c.role_title, c.company].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button onClick={() => unlink(c.id)} style={{ color: 'var(--iven-muted)' }} title="Unlink">
            <X size={15} />
          </button>
        </Row>
      ))}

      {linkOpen && (
        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ border: '1px solid var(--iven-border)' }}>
          {allContacts.length === 0 ? (
            <Empty>No other contacts to link.</Empty>
          ) : (
            allContacts.map(c => (
              <button
                key={c.id}
                onClick={() => link(c.id)}
                className="text-left text-[13px] px-2 py-1.5 rounded"
                style={{ color: 'var(--iven-text)' }}
              >
                {c.name} <span style={{ color: 'var(--iven-muted)' }}>{c.company}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Interviews ──────────────────────────────────────────────────────────────
function InterviewsTab({ application }: { application: Application }) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [adding, setAdding] = useState(false)
  const [type, setType] = useState<InterviewType>('phone')
  const [when, setWhen] = useState('')
  const [prep, setPrep] = useState('')
  const supabase = createClient()

  const load = useCallback(() => {
    fetchInterviews(supabase).then(all =>
      setInterviews(all.filter(i => i.application_id === application.id))
    )
  }, [application.id, supabase])

  useEffect(load, [load])

  async function add() {
    if (!when) return
    await createInterview(supabase, {
      application_id: application.id,
      type,
      scheduled_at: new Date(when).toISOString(),
      prep_notes: prep || null,
    })
    setAdding(false)
    setWhen('')
    setPrep('')
    load()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <SectionLabel>Interviews</SectionLabel>
        <Button variant="ghost" onClick={() => setAdding(a => !a)}>
          <span className="flex items-center gap-1.5"><Plus size={12} /> Schedule</span>
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ border: '1px solid var(--iven-border)' }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type">
              <Select
                value={type}
                onChange={v => setType(v as InterviewType)}
                options={Object.entries(INTERVIEW_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </Field>
            <Field label="When">
              <TextInput type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
            </Field>
          </div>
          <Field label="Prep notes">
            <TextArea value={prep} onChange={e => setPrep(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={add} disabled={!when}>Add</Button>
          </div>
        </div>
      )}

      {interviews.length === 0 && !adding && <Empty>No interviews scheduled.</Empty>}
      {interviews.map(iv => (
        <Row key={iv.id}>
          <div className="flex-1">
            <div className="text-[13px] font-medium" style={{ color: 'var(--iven-text)' }}>
              {INTERVIEW_TYPE_LABELS[iv.type]}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--iven-muted)' }}>
              {formatDateTime(iv.scheduled_at)}
            </div>
          </div>
        </Row>
      ))}
    </div>
  )
}

// ── Documents ───────────────────────────────────────────────────────────────
function DocumentsTab({ applicationId }: { applicationId: string }) {
  const [docs, setDocs] = useState<InternshipDocument[]>([])
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [type, setType] = useState<InternshipDocument['type']>('resume')
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const load = useCallback(() => {
    fetchDocuments(supabase, applicationId).then(setDocs)
  }, [applicationId, supabase])

  useEffect(load, [load])

  async function addLink() {
    if (!label.trim() || !externalUrl.trim()) return
    await createDocument(supabase, {
      application_id: applicationId,
      label: label.trim(),
      external_url: externalUrl.trim(),
      type,
    })
    setLabel('')
    setExternalUrl('')
    setAdding(false)
    load()
  }

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const path = `${session.user.id}/${applicationId}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('internship-docs').upload(path, file)
      if (error) {
        alert('Upload failed: ' + error.message)
        return
      }
      await createDocument(supabase, {
        application_id: applicationId,
        label: file.name,
        file_url: path,
        type,
      })
      load()
    } finally {
      setUploading(false)
    }
  }

  async function openDoc(doc: InternshipDocument) {
    if (doc.external_url) {
      window.open(doc.external_url, '_blank')
      return
    }
    if (doc.file_url) {
      const { data } = await supabase.storage
        .from('internship-docs')
        .createSignedUrl(doc.file_url, 60)
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    }
  }

  async function remove(doc: InternshipDocument) {
    if (doc.file_url) {
      await supabase.storage.from('internship-docs').remove([doc.file_url])
    }
    await deleteDocument(supabase, doc.id)
    load()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <SectionLabel>Documents</SectionLabel>
        <div className="flex gap-2">
          <label>
            <input
              type="file"
              className="hidden"
              onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}
            />
            <span
              className="font-mono text-[11px] font-semibold tracking-[1px] uppercase rounded-lg px-3.5 py-2 cursor-pointer inline-block"
              style={{ border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </span>
          </label>
          <Button variant="ghost" onClick={() => setAdding(a => !a)}>
            <span className="flex items-center gap-1.5"><Plus size={12} /> Link</span>
          </Button>
        </div>
      </div>

      {adding && (
        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ border: '1px solid var(--iven-border)' }}>
          <Field label="Label">
            <TextInput value={label} onChange={e => setLabel(e.target.value)} />
          </Field>
          <Field label="External URL">
            <TextInput value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Type">
            <Select
              value={type}
              onChange={v => setType(v as InternshipDocument['type'])}
              options={[
                { value: 'resume', label: 'Resume' },
                { value: 'cover_letter', label: 'Cover Letter' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={addLink} disabled={!label.trim() || !externalUrl.trim()}>Add</Button>
          </div>
        </div>
      )}

      {docs.length === 0 && !adding && <Empty>No documents.</Empty>}
      {docs.map(d => (
        <Row key={d.id}>
          <button onClick={() => openDoc(d)} className="flex-1 text-left flex items-center gap-2" style={{ color: 'var(--iven-text)' }}>
            <Pill>{d.type === 'cover_letter' ? 'Cover' : d.type === 'resume' ? 'Resume' : 'Doc'}</Pill>
            <span className="text-[13px]">{d.label}</span>
            <ExternalLink size={12} style={{ color: 'var(--iven-muted)' }} />
          </button>
          <button onClick={() => remove(d)} style={{ color: 'var(--iven-muted)' }} title="Delete">
            <Trash2 size={14} />
          </button>
        </Row>
      ))}
    </div>
  )
}

// ── Tasks ───────────────────────────────────────────────────────────────────
function TasksTab({ applicationId }: { applicationId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const supabase = createClient()

  const load = useCallback(() => {
    fetchTasks(supabase).then(all => setTasks(all.filter(t => t.application_id === applicationId)))
  }, [applicationId, supabase])

  useEffect(load, [load])

  async function add() {
    if (!title.trim()) return
    await createTask(supabase, {
      title: title.trim(),
      application_id: applicationId,
      due_date: due ? new Date(due).toISOString() : null,
    })
    setTitle('')
    setDue('')
    load()
  }

  async function toggle(t: Task) {
    await updateTask(supabase, t.id, { done: !t.done })
    load()
  }

  async function remove(id: string) {
    await deleteTask(supabase, id)
    load()
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>Tasks</SectionLabel>
      <div className="flex gap-2">
        <TextInput value={title} onChange={e => setTitle(e.target.value)} placeholder="New task…" onKeyDown={e => e.key === 'Enter' && add()} />
        <TextInput type="date" value={due} onChange={e => setDue(e.target.value)} style={{ width: 150 }} />
        <Button onClick={add} disabled={!title.trim()}>Add</Button>
      </div>
      {tasks.length === 0 && <Empty>No tasks.</Empty>}
      {tasks.map(t => (
        <Row key={t.id}>
          <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
          <div className="flex-1">
            <span
              className="text-[13px]"
              style={{
                color: t.done ? 'var(--iven-muted)' : 'var(--iven-text)',
                textDecoration: t.done ? 'line-through' : 'none',
              }}
            >
              {t.title}
            </span>
            {t.due_date && (
              <span className="text-[11px] ml-2" style={{ color: 'var(--iven-muted)' }}>
                {formatShortDate(t.due_date)}
              </span>
            )}
          </div>
          <button onClick={() => remove(t.id)} style={{ color: 'var(--iven-muted)' }}>
            <Trash2 size={14} />
          </button>
        </Row>
      ))}
    </div>
  )
}

// ── Small shared pieces ─────────────────────────────────────────────────────
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[13px] py-4 text-center" style={{ color: 'var(--iven-muted)' }}>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-grid)' }}
    >
      {children}
    </div>
  )
}
