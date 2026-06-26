'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { upsertWeeklyGoal, updateSettings } from '@/lib/internship/supabase'
import type { WeeklyGoal, InternshipSettings } from '@/types/internship'
import { formatShortDate, currentWeekStart } from '@/lib/internship/dates'
import { Field, TextInput, Button } from './ui'

// Bookmarklet: opens the tracker's quick-add prefilled with the current page URL.
function bookmarkletHref(origin: string): string {
  const target = `${origin}/apps/internship?add=`
  // Keep it on one line; encodeURIComponent the current location.
  const code = `javascript:(function(){window.open('${target}'+encodeURIComponent(window.location.href),'_blank');})();`
  return code
}

export default function SettingsPanel({
  settings,
  weeklyGoals,
  onSettingsChange,
  onGoalsChange,
}: {
  settings: InternshipSettings
  weeklyGoals: WeeklyGoal[]
  onSettingsChange: (s: InternshipSettings) => void
  onGoalsChange: (g: WeeklyGoal[]) => void
}) {
  const [emailEnabled, setEmailEnabled] = useState(settings.email_nudges_enabled)
  const [digestEmail, setDigestEmail] = useState(settings.digest_email ?? '')
  const supabase = createClient()

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://stephenonochie.com'
  const thisWeek = currentWeekStart()

  // Show current + future weeks only.
  const upcoming = weeklyGoals.filter(g => g.week_start >= thisWeek).slice(0, 16)

  async function saveEmail() {
    const patch = { email_nudges_enabled: emailEnabled, digest_email: digestEmail.trim() || null }
    await updateSettings(supabase, patch)
    onSettingsChange({ ...settings, ...patch })
  }

  async function saveGoal(weekStart: string, value: number) {
    await upsertWeeklyGoal(supabase, weekStart, value)
    onGoalsChange(
      weeklyGoals.some(g => g.week_start === weekStart)
        ? weeklyGoals.map(g => (g.week_start === weekStart ? { ...g, target_apps: value } : g))
        : [...weeklyGoals, { id: weekStart, user_id: settings.user_id, week_start: weekStart, target_apps: value, created_at: '' }]
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-[640px]">
      {/* Email nudges */}
      <Section title="Email Nudges">
        <label className="flex items-center gap-2.5 cursor-pointer mb-3">
          <input type="checkbox" checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)} />
          <span className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
            Send a weekly digest email (Sunday review + due deadlines, follow-ups, interviews)
          </span>
        </label>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Digest Email">
              <TextInput value={digestEmail} onChange={e => setDigestEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
          </div>
          <Button onClick={saveEmail}>Save</Button>
        </div>
      </Section>

      {/* Weekly goals */}
      <Section title="Weekly Application Targets">
        <div className="flex flex-col gap-2">
          {upcoming.map(g => (
            <div key={g.week_start} className="flex items-center gap-3">
              <span className="text-[12px] font-mono w-24" style={{ color: 'var(--iven-muted)' }}>
                {formatShortDate(g.week_start)}
              </span>
              <input
                type="range"
                min={0}
                max={15}
                value={g.target_apps}
                onChange={e => saveGoal(g.week_start, Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--iven-accent)' }}
              />
              <span className="font-mono text-[13px] font-semibold w-6 text-right" style={{ color: 'var(--iven-text)' }}>
                {g.target_apps}
              </span>
            </div>
          ))}
          {upcoming.length === 0 && (
            <div className="text-[13px]" style={{ color: 'var(--iven-muted)' }}>No upcoming weeks seeded.</div>
          )}
        </div>
      </Section>

      {/* Bookmarklet */}
      <Section title="Quick-Add Bookmarklet">
        <p className="text-[13px] mb-3" style={{ color: 'var(--iven-muted)' }}>
          Drag this button to your bookmarks bar. On any job posting, click it to open the tracker&apos;s
          quick-add prefilled with that page&apos;s URL.
        </p>
        <a
          href={bookmarkletHref(origin)}
          onClick={e => e.preventDefault()}
          className="inline-block font-mono text-[12px] font-semibold tracking-[1px] uppercase rounded-lg px-4 py-2"
          style={{ background: 'var(--iven-accent)', color: '#2C1F0E', cursor: 'grab' }}
        >
          + Add to Internship Tracker
        </a>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}
    >
      <div className="font-mono text-[10px] font-semibold tracking-[2px] uppercase mb-4" style={{ color: 'var(--iven-accent)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}
