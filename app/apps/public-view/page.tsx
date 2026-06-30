'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import IvenModule from '@/components/iven/IvenModule'
import { Check, Loader2, ExternalLink } from 'lucide-react'
import { fetchPublicViewSettings, updatePublicViewSettings } from '@/lib/public-view/supabase'
import type { PublicViewSettings } from '@/types/public-view'

type SaveState = 'idle' | 'saving' | 'saved'

export default function PublicViewPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<PublicViewSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // Local form fields
  const [resumeUrl, setResumeUrl] = useState('')
  const [resumeHeading, setResumeHeading] = useState('')
  const [resumeBlurb, setResumeBlurb] = useState('')
  const [showReading, setShowReading] = useState(true)
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')

  const hydrate = useCallback((s: PublicViewSettings) => {
    setSettings(s)
    setResumeUrl(s.resume_url)
    setResumeHeading(s.resume_heading)
    setResumeBlurb(s.resume_blurb)
    setShowReading(s.show_currently_reading)
    setGithubUrl(s.github_url)
    setLinkedinUrl(s.linkedin_url)
    setInstagramUrl(s.instagram_url)
  }, [])

  useEffect(() => {
    fetchPublicViewSettings(supabase)
      .then(hydrate)
      .finally(() => setLoading(false))
  }, [supabase, hydrate])

  async function save() {
    if (!settings) return
    setSaveState('saving')
    const patch = {
      resume_url: resumeUrl.trim(),
      resume_heading: resumeHeading.trim(),
      resume_blurb: resumeBlurb.trim(),
      show_currently_reading: showReading,
      github_url: githubUrl.trim(),
      linkedin_url: linkedinUrl.trim(),
      instagram_url: instagramUrl.trim(),
    }
    await updatePublicViewSettings(supabase, patch)
    setSettings({ ...settings, ...patch })
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 1800)
  }

  return (
    <IvenModule
      index={13}
      title="Public View"
      right={
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[1px]"
          style={{ color: 'var(--iven-muted)' }}
        >
          <ExternalLink size={13} /> View site
        </a>
      }
    >
      <p className="text-[13px] mb-6 max-w-[620px]" style={{ color: 'var(--iven-muted)' }}>
        These settings control what appears on your public portfolio at
        stephenonochie.com. Changes go live on the next page load.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--iven-muted)' }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-[620px]">
          <Section title="Resume">
            <FieldRow label="Resume link URL">
              <Input value={resumeUrl} onChange={setResumeUrl} placeholder="https://…" />
            </FieldRow>
            <FieldRow label="Section heading">
              <Input value={resumeHeading} onChange={setResumeHeading} placeholder="Resume" />
            </FieldRow>
            <FieldRow label="Section blurb">
              <Textarea value={resumeBlurb} onChange={setResumeBlurb} />
            </FieldRow>
          </Section>

          <Section title="Sections">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showReading}
                onChange={e => setShowReading(e.target.checked)}
              />
              <span className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
                Show the “Currently Reading” card on the public site
              </span>
            </label>
          </Section>

          <Section title="Social Links">
            <FieldRow label="GitHub">
              <Input value={githubUrl} onChange={setGithubUrl} placeholder="https://github.com/…" />
            </FieldRow>
            <FieldRow label="LinkedIn">
              <Input value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/…" />
            </FieldRow>
            <FieldRow label="Instagram">
              <Input value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/…" />
            </FieldRow>
          </Section>

          <div>
            <button
              onClick={save}
              disabled={saveState === 'saving'}
              className="font-mono text-[11px] uppercase tracking-[1px] px-4 py-2 rounded transition-transform"
              style={
                saveState === 'saved'
                  ? { background: '#7C8C5A', color: '#fff', transform: 'scale(1.04)' }
                  : { background: 'var(--iven-accent)', color: '#2C1F0E' }
              }
            >
              {saveState === 'saving' ? (
                <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Saving</span>
              ) : saveState === 'saved' ? (
                <span className="flex items-center gap-1.5"><Check size={13} /> Saved</span>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </div>
      )}
    </IvenModule>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[2px] mb-4"
        style={{ color: 'var(--iven-accent)' }}
      >
        {title}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-mono uppercase tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[13px] px-3 py-2 rounded outline-none"
      style={{
        background: 'var(--iven-bg)',
        border: '1px solid var(--iven-grid)',
        color: 'var(--iven-text)',
      }}
    />
  )
}

function Textarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={3}
      className="w-full text-[13px] px-3 py-2 rounded outline-none resize-y"
      style={{
        background: 'var(--iven-bg)',
        border: '1px solid var(--iven-grid)',
        color: 'var(--iven-text)',
      }}
    />
  )
}
