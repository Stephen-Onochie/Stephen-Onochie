'use client'

import { useState } from 'react'
import { Check, Loader2, Plus, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { upsertWeeklyGoal, updateSettings } from '@/lib/internship/supabase'
import type { WeeklyGoal, InternshipSettings } from '@/types/internship'
import { formatShortDate, currentWeekStart, mondayOf } from '@/lib/internship/dates'
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
  const [subscribed, setSubscribed] = useState(settings.email_subscribed)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [newWeek, setNewWeek] = useState('')
  const supabase = createClient()

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://stephenonochie.com'
  const thisWeek = currentWeekStart()

  // Show current + future weeks only, sorted by date.
  const upcoming = weeklyGoals
    .filter(g => g.week_start >= thisWeek)
    .sort((a, b) => (a.week_start < b.week_start ? -1 : 1))

  async function saveEmail() {
    setSaveState('saving')
    const patch = { email_nudges_enabled: emailEnabled, digest_email: digestEmail.trim() || null }
    await updateSettings(supabase, patch)
    onSettingsChange({ ...settings, ...patch })
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 1800)
  }

  async function toggleSubscribed() {
    const next = !subscribed
    setSubscribed(next)
    await updateSettings(supabase, { email_subscribed: next })
    onSettingsChange({ ...settings, email_subscribed: next })
  }

  async function sendTest() {
    setTestState('sending')
    setTestMsg('')
    try {
      // Persist the current email first so the test goes where the field shows.
      if ((settings.digest_email ?? '') !== digestEmail.trim()) {
        await updateSettings(supabase, { digest_email: digestEmail.trim() || null })
        onSettingsChange({ ...settings, digest_email: digestEmail.trim() || null })
      }
      const res = await fetch('/api/internship/test-digest', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setTestState('sent')
        setTestMsg(`Sent to ${data.to}`)
      } else {
        setTestState('error')
        setTestMsg(data.error ?? 'Send failed')
      }
    } catch {
      setTestState('error')
      setTestMsg('Send failed')
    }
    setTimeout(() => {
      setTestState('idle')
      setTestMsg('')
    }, 4000)
  }

  async function saveGoal(weekStart: string, value: number) {
    await upsertWeeklyGoal(supabase, weekStart, value)
    onGoalsChange(
      weeklyGoals.some(g => g.week_start === weekStart)
        ? weeklyGoals.map(g => (g.week_start === weekStart ? { ...g, target_apps: value } : g))
        : [...weeklyGoals, { id: weekStart, user_id: settings.user_id, week_start: weekStart, target_apps: value, created_at: '' }]
    )
  }

  async function addWeek() {
    if (!newWeek) return
    // Snap the picked date to its Monday so it matches the goal week_start key.
    const [y, m, d] = newWeek.split('-').map(Number)
    const weekStart = mondayOf(new Date(y, m - 1, d))
    await saveGoal(weekStart, 5)
    setNewWeek('')
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
          <Button
            onClick={saveEmail}
            disabled={saveState === 'saving'}
            style={
              saveState === 'saved'
                ? { background: '#7C8C5A', color: '#fff', transform: 'scale(1.04)' }
                : undefined
            }
          >
            {saveState === 'saving' ? (
              <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Saving</span>
            ) : saveState === 'saved' ? (
              <span className="flex items-center gap-1.5"><Check size={13} /> Saved</span>
            ) : (
              'Save'
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={sendTest}
            disabled={testState === 'sending' || !digestEmail.trim()}
            title="Send a test digest to the address above"
          >
            {testState === 'sending' ? (
              <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Sending</span>
            ) : (
              <span className="flex items-center gap-1.5"><Send size={12} /> Test Send</span>
            )}
          </Button>
        </div>
        {testMsg && (
          <div
            className="text-[12px] mt-2 flex items-center gap-1.5"
            style={{ color: testState === 'error' ? '#A8743B' : '#7C8C5A' }}
          >
            {testState === 'sent' && <Check size={13} />}
            {testMsg}
          </div>
        )}

        <div
          className="flex items-center justify-between mt-4 pt-3"
          style={{ borderTop: '1px solid var(--iven-grid)' }}
        >
          <span className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>
            {subscribed
              ? 'Subscribed to internship emails (digest + daily discovery).'
              : 'Unsubscribed — no internship emails will be sent.'}
          </span>
          <Button variant="ghost" onClick={toggleSubscribed}>
            {subscribed ? 'Unsubscribe' : 'Re-subscribe'}
          </Button>
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
            <div className="text-[13px]" style={{ color: 'var(--iven-muted)' }}>No upcoming weeks set.</div>
          )}
        </div>

        {/* Add a week */}
        <div
          className="flex items-end gap-2 mt-4 pt-4"
          style={{ borderTop: '1px solid var(--iven-grid)' }}
        >
          <div className="flex-1 max-w-[220px]">
            <Field label="Add a week (any date in it)">
              <TextInput type="date" value={newWeek} onChange={e => setNewWeek(e.target.value)} />
            </Field>
          </div>
          <Button onClick={addWeek} disabled={!newWeek}>
            <span className="flex items-center gap-1.5"><Plus size={13} /> Add Week</span>
          </Button>
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
