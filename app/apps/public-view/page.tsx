'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import IvenModule from '@/components/iven/IvenModule'
import { Check, Loader2, ExternalLink } from 'lucide-react'
import { fetchPublicViewSettings, updatePublicViewSettings } from '@/lib/public-view/supabase'
import type { PublicViewSettings } from '@/types/public-view'
import ProjectsEditor from '@/components/public-view/ProjectsEditor'

type SaveState = 'idle' | 'saving' | 'saved'
type Tab = 'settings' | 'projects'

export default function PublicViewPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<PublicViewSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [tab, setTab] = useState<Tab>('projects')

  // Local form fields
  const [resumeUrl, setResumeUrl] = useState('')
  const [showReading, setShowReading] = useState(true)
  const [showWatching, setShowWatching] = useState(true)
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')

  const hydrate = useCallback((s: PublicViewSettings) => {
    setSettings(s)
    setResumeUrl(s.resume_url)
    setShowReading(s.show_currently_reading)
    setShowWatching(s.show_currently_watching)
    setGithubUrl(s.github_url)
    setLinkedinUrl(s.linkedin_url)
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
      show_currently_reading: showReading,
      show_currently_watching: showWatching,
      github_url: githubUrl.trim(),
      linkedin_url: linkedinUrl.trim(),
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
        Controls what appears on your public portfolio at stephenonochie.com. Homepage copy
        (hero, Now strip, silicon track, experience) lives in lib/portfolio/content.ts.
      </p>

      <div className="flex gap-1 mb-6" role="tablist">
        {(['projects', 'settings'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="font-mono text-[11px] uppercase tracking-[1px] px-3.5 py-2 rounded"
            style={
              tab === t
                ? { background: 'var(--iven-text)', color: 'var(--iven-bg)' }
                : { border: '1px solid var(--iven-grid)', color: 'var(--iven-muted)' }
            }
          >
            {t === 'projects' ? 'Projects' : 'Site settings'}
          </button>
        ))}
      </div>

      {tab === 'projects' ? (
        <ProjectsEditor supabase={supabase} />
      ) : loading ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--iven-muted)' }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-[620px]">
          <Section title="Résumé">
            <FieldRow label="Résumé link (header, hero and contact buttons)">
              <Input value={resumeUrl} onChange={setResumeUrl} placeholder="https://…" />
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
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showWatching}
                onChange={e => setShowWatching(e.target.checked)}
              />
              <span className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
                Show the “Currently Watching” card on the public site (pick the title in Watchlist)
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
