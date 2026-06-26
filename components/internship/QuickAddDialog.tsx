'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createApplication } from '@/lib/internship/supabase'
import type {
  Application,
  ApplicationInsert,
  CityTag,
  Lane,
  RoleType,
  Priority,
} from '@/types/internship'
import {
  CITY_LABELS,
  LANE_LABELS,
  ROLE_TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/types/internship'
import { Button, Field, TextInput, Select, TextArea } from './ui'

const overlayStyle = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(20,16,12,0.55)',
  zIndex: 100,
}

export default function QuickAddDialog({
  open,
  onOpenChange,
  onCreated,
  initialUrl,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (app: Application) => void
  initialUrl?: string
}) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState<CityTag>('other')
  const [lane, setLane] = useState<Lane>('lane2_portal')
  const [roleType, setRoleType] = useState<RoleType>('swe')
  const [priority, setPriority] = useState<Priority>('medium')
  const [notes, setNotes] = useState('')
  const [scraping, setScraping] = useState(false)
  const [saving, setSaving] = useState(false)

  function reset() {
    setUrl('')
    setCompany('')
    setRole('')
    setLocation('')
    setCity('other')
    setLane('lane2_portal')
    setRoleType('swe')
    setPriority('medium')
    setNotes('')
  }

  async function handleScrape() {
    if (!url.trim()) return
    setScraping(true)
    try {
      const res = await fetch('/api/internship/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.company && !company) setCompany(data.company)
        if (data.role_title && !role) setRole(data.role_title)
        if (data.location && !location) setLocation(data.location)
      }
    } catch {
      // best-effort; user fills manually
    } finally {
      setScraping(false)
    }
  }

  async function handleSave() {
    if (!company.trim() || !role.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const insert: ApplicationInsert = {
        company: company.trim(),
        role_title: role.trim(),
        job_url: url.trim() || null,
        location: location.trim() || null,
        city_tag: city,
        lane,
        role_type: roleType,
        priority,
        notes: notes.trim() || null,
      }
      const created = await createApplication(supabase, insert)
      onCreated(created)
      reset()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={overlayStyle} />
        <Dialog.Content
          data-iven-theme-scope
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] rounded-2xl p-6 w-[min(520px,92vw)] max-h-[90vh] overflow-y-auto"
          style={{
            background: 'var(--iven-surface)',
            border: '1px solid var(--iven-border)',
            boxShadow: '0 24px 60px rgba(20,16,12,0.4)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title
              className="font-playfair font-bold text-[22px]"
              style={{ color: 'var(--iven-text)' }}
            >
              Add Application
            </Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" style={{ color: 'var(--iven-muted)' }}>
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-3">
            <Field label="Job URL (optional — paste to autofill)">
              <div className="flex gap-2">
                <TextInput
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://…"
                />
                <Button
                  variant="ghost"
                  onClick={handleScrape}
                  disabled={scraping || !url.trim()}
                  style={{ flexShrink: 0 }}
                >
                  {scraping ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={12} /> Fill
                    </span>
                  )}
                </Button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Company *">
                <TextInput value={company} onChange={e => setCompany(e.target.value)} />
              </Field>
              <Field label="Role *">
                <TextInput value={role} onChange={e => setRole(e.target.value)} />
              </Field>
            </div>

            <Field label="Location">
              <TextInput value={location} onChange={e => setLocation(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Lane">
                <Select
                  value={lane}
                  onChange={v => setLane(v as Lane)}
                  options={Object.entries(LANE_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="City">
                <Select
                  value={city}
                  onChange={v => setCity(v as CityTag)}
                  options={Object.entries(CITY_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Role Type">
                <Select
                  value={roleType}
                  onChange={v => setRoleType(v as RoleType)}
                  options={Object.entries(ROLE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Priority">
                <Select
                  value={priority}
                  onChange={v => setPriority(v as Priority)}
                  options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
            </div>

            <Field label="Notes">
              <TextArea value={notes} onChange={e => setNotes(e.target.value)} />
            </Field>

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !company.trim() || !role.trim()}
              >
                {saving ? 'Saving…' : 'Add to Wishlist'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
