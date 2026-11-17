'use client'

import { useState, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Check, Loader2 } from 'lucide-react'
import { fetchPublicViewSettings, updatePublicViewSettings } from '@/lib/public-view/supabase'
import { Section, FieldRow, Input } from './ui'

type SaveState = 'idle' | 'saving' | 'saved'

export default function SiteSettingsPanel({ supabase }: { supabase: SupabaseClient }) {
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [showReading, setShowReading] = useState(true)
  const [showWatching, setShowWatching] = useState(true)
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')

  useEffect(() => {
    fetchPublicViewSettings(supabase)
      .then(s => {
        setShowReading(s.show_currently_reading)
        setShowWatching(s.show_currently_watching)
        setGithubUrl(s.github_url)
        setLinkedinUrl(s.linkedin_url)
      })
      .finally(() => setLoading(false))
  }, [supabase])

  async function save() {
    setSaveState('saving')
    await updatePublicViewSettings(supabase, {
      show_currently_reading: showReading,
      show_currently_watching: showWatching,
      github_url: githubUrl.trim(),
      linkedin_url: linkedinUrl.trim(),
    })
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 1800)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--iven-muted)' }}>
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-[620px]">
      <Section title="Sections">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={showReading} onChange={e => setShowReading(e.target.checked)} />
          <span className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
            Show the “Currently Reading” card on the public site
          </span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={showWatching} onChange={e => setShowWatching(e.target.checked)} />
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
        <SaveButton state={saveState} onClick={save} />
      </div>
    </div>
  )
}

export function SaveButton({ state, onClick, label = 'Save changes' }: { state: SaveState; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={state === 'saving'}
      className="font-mono text-[11px] uppercase tracking-[1px] px-4 py-2 rounded transition-transform"
      style={
        state === 'saved'
          ? { background: '#7C8C5A', color: '#fff', transform: 'scale(1.04)' }
          : { background: 'var(--iven-accent)', color: '#2C1F0E' }
      }
    >
      {state === 'saving' ? (
        <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Saving</span>
      ) : state === 'saved' ? (
        <span className="flex items-center gap-1.5"><Check size={13} /> Saved</span>
      ) : (
        label
      )}
    </button>
  )
}
