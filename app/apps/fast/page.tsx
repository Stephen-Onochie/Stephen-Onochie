'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/apps/AppHeader'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { Settings, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'
import type { FastSession, FastSettings } from '@/types/fast'

// ─── Config ───────────────────────────────────────────────────────

const DAY_ABBRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const GUIDELINES = [
  {
    title: 'What to consume',
    body: 'Water, black coffee, unsweetened herbal tea, and electrolytes are all fine. Stay well hydrated throughout.',
  },
  {
    title: 'What to avoid',
    body: 'No calories of any kind — that means no sweeteners, milk, juice, gum, or snacks. Anything with calories breaks the fast.',
  },
  {
    title: 'How to break a fast safely',
    body: 'Ease back in: start with bone broth or a small light meal, then wait before a normal-sized meal. Avoid large or heavy meals immediately.',
  },
  {
    title: 'Warning signs to stop early',
    body: 'End the fast and eat if you feel dizzy, lightheaded, have heart palpitations, or experience confusion. Your safety comes first.',
  },
  {
    title: 'Physical activity',
    body: 'Light movement (walking, gentle stretching) is fine. Avoid intense or prolonged exercise, especially deep into a long fast.',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Can I add sweeteners to coffee?',
    a: 'No. Sweeteners — even zero-calorie ones — can trigger an insulin response and undermine the fast. Drink coffee black.',
  },
  {
    q: 'What if I feel dizzy?',
    a: 'Dizziness, palpitations, or confusion are signals to stop. Break the fast safely with broth or a light meal and rest.',
  },
  {
    q: 'What counts as breaking a fast?',
    a: 'Consuming anything with calories. Water, black coffee, plain herbal tea, and electrolytes are allowed; everything else breaks it.',
  },
  {
    q: 'How is the cooldown calculated?',
    a: 'The cooldown counts from the end of your most recent completed fast. A new fast can only begin once that many days have fully elapsed.',
  },
  {
    q: 'Can I change the cooldown rule?',
    a: 'Yes — open Settings and adjust the Cooldown Period. The new value is enforced immediately, with a hard minimum of 1 day.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// DD:HH:MM:SS — days hidden until the count crosses 24h
function formatElapsed(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (days > 0) return `${pad(days)}:${pad(hours)}:${pad(mins)}:${pad(secs)}`
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`
}

// Coarse "Xd Yh Zm" for cooldown countdowns
function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${mins}m`)
  return parts.join(' ')
}

function formatHrs(hrs: number) {
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24)
    const rem = Math.round(hrs % 24)
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`
  }
  return `${hrs.toFixed(1)}h`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

// ─── Page ─────────────────────────────────────────────────────────

export default function FastPage() {
  const supabase = createClient()

  const [settings, setSettings] = useState<FastSettings | null>(null)
  const [activeFast, setActiveFast] = useState<FastSession | null>(null)
  const [completedFasts, setCompletedFasts] = useState<FastSession[]>([])
  const [loading, setLoading] = useState(true)

  const [now, setNow] = useState(() => Date.now())
  const [starting, setStarting] = useState(false)

  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [ending, setEnding] = useState(false)

  const [detailFast, setDetailFast] = useState<FastSession | null>(null)
  const [calMonth, setCalMonth] = useState(() => new Date())
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    let { data: s } = await supabase
      .from('fast_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (!s) {
      const { data: created } = await supabase
        .from('fast_settings')
        .insert({ user_id: session.user.id })
        .select()
        .single()
      s = created
    }
    setSettings(s)

    const { data: active } = await supabase
      .from('fast_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setActiveFast(active ?? null)

    const { data: done } = await supabase
      .from('fast_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
    setCompletedFasts(done ?? [])

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  // Re-derive the live timer / cooldown from timestamps each second
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 1000)
    const onVisibility = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  async function startFast() {
    if (starting || activeFast) return
    setStarting(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setStarting(false); return }

    // Re-validate the cooldown against the DB so a stale UI can't bypass it
    const { data: latest } = await supabase
      .from('fast_sessions')
      .select('ended_at')
      .eq('user_id', session.user.id)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const cooldownDays = settings?.cooldown_days ?? 14
    if (latest?.ended_at) {
      const allowed = new Date(latest.ended_at).getTime() + cooldownDays * 86400000
      if (Date.now() < allowed) { setStarting(false); await loadData(); return }
    }

    await supabase.from('fast_sessions').insert({
      user_id: session.user.id,
      started_at: new Date().toISOString(),
    })

    setStarting(false)
    await loadData()
  }

  async function confirmEndFast() {
    if (!activeFast || ending) return
    setEnding(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setEnding(false); return }

    const endedAt = new Date()
    const durationHrs = (endedAt.getTime() - new Date(activeFast.started_at).getTime()) / 3600000

    await supabase
      .from('fast_sessions')
      .update({
        ended_at: endedAt.toISOString(),
        duration_hrs: Number(durationHrs.toFixed(2)),
        notes: notesDraft.trim() || null,
      })
      .eq('id', activeFast.id)

    setEnding(false)
    setEndDialogOpen(false)
    setNotesDraft('')
    await loadData()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-beige">
        <AppHeader title="FastTrack" />
        <div className="max-w-lg mx-auto px-4 pt-8 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  const cooldownDays = settings?.cooldown_days ?? 14
  const targetHrs = settings?.target_duration_hrs ?? 48

  // ── Cooldown derivation ──
  const lastCompleted = completedFasts[0] ?? null
  const nextAllowedStart = lastCompleted?.ended_at
    ? new Date(lastCompleted.ended_at).getTime() + cooldownDays * 86400000
    : 0
  const cooldownActive = !activeFast && now < nextAllowedStart

  // ── Active timer derivation ──
  const elapsedSeconds = activeFast
    ? (now - new Date(activeFast.started_at).getTime()) / 1000
    : 0
  const progress = activeFast ? Math.min(elapsedSeconds / (targetHrs * 3600), 1) : 0

  // ── Metrics ──
  const totalFasts = completedFasts.length
  const totalHrs = completedFasts.reduce((sum, f) => sum + (f.duration_hrs ?? 0), 0)
  const longestHrs = completedFasts.reduce((max, f) => Math.max(max, f.duration_hrs ?? 0), 0)
  const avgHrs = totalFasts > 0 ? totalHrs / totalFasts : 0

  // Calendar setup
  const today = new Date()
  const calYear = calMonth.getFullYear()
  const calMonthIdx = calMonth.getMonth()
  const firstDow = new Date(calYear, calMonthIdx, 1).getDay()
  const daysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate()

  function fastOnDay(day: Date): FastSession | null {
    const dayStart = startOfDay(day).getTime()
    const dayEnd = dayStart + 86400000
    for (const f of completedFasts) {
      if (!f.ended_at) continue
      const s = new Date(f.started_at).getTime()
      const e = new Date(f.ended_at).getTime()
      if (s < dayEnd && e >= dayStart) return f
    }
    return null
  }

  function isCooldownDay(day: Date): boolean {
    if (!lastCompleted?.ended_at) return false
    if (fastOnDay(day)) return false
    const dayStart = startOfDay(day).getTime()
    const dayEnd = dayStart + 86400000
    const cooldownStart = new Date(lastCompleted.ended_at).getTime()
    // Any day overlapping the window (lastEnd, nextAllowedStart)
    return dayEnd > cooldownStart && dayStart < nextAllowedStart
  }

  return (
    <main className="min-h-screen bg-beige pb-12">
      <AppHeader
        title="FastTrack"
        right={
          <Link href="/apps/fast/settings" className="text-textMuted hover:text-textPrimary transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        }
      />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        {/* ── Timer (hero) ── */}
        <section className="bg-surface rounded-2xl px-6 py-8 flex flex-col items-center">
          {activeFast ? (
            <>
              <div className="font-inter text-xs uppercase tracking-widest text-gold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                Fasting
              </div>
              <div className="font-mono text-5xl sm:text-6xl font-bold text-textPrimary tracking-tight tabular-nums">
                {formatElapsed(elapsedSeconds)}
              </div>
              <div className="font-inter text-xs text-textMuted mt-2">
                Started {formatDateTime(activeFast.started_at)}
              </div>
              <div className="w-full bg-beige rounded-full h-2 mt-5">
                <div
                  className="bg-gold h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="font-inter text-[11px] text-textMuted mt-1.5 self-end">
                {Math.round(progress * 100)}% of {formatHrs(targetHrs)} target
              </div>
              <button
                onClick={() => { setNotesDraft(''); setEndDialogOpen(true) }}
                className="mt-6 w-full bg-gold text-white font-inter font-semibold py-3.5 rounded-2xl text-base hover:bg-brownAccent transition-colors"
              >
                End Fast
              </button>
            </>
          ) : cooldownActive ? (
            <>
              <div className="font-inter text-xs uppercase tracking-widest text-textMuted mb-3">Cooldown</div>
              <div className="font-mono text-3xl sm:text-4xl font-bold text-textMuted tracking-tight tabular-nums text-center">
                {formatRemaining(nextAllowedStart - now)}
              </div>
              <div className="font-inter text-sm text-textMuted mt-2 text-center">
                Next fast available {formatDate(new Date(nextAllowedStart).toISOString())}
              </div>
              <button
                disabled
                className="mt-6 w-full bg-grid/40 text-textMuted font-inter font-semibold py-3.5 rounded-2xl text-base cursor-not-allowed"
              >
                Start Fast
              </button>
            </>
          ) : (
            <>
              <div className="font-inter text-xs uppercase tracking-widest text-textMuted mb-3">Ready</div>
              <div className="font-playfair text-2xl font-bold text-textPrimary text-center">
                {settings?.fast_label ?? 'Controlled Fast'}
              </div>
              <div className="font-inter text-sm text-textMuted mt-1 text-center">
                {formatHrs(targetHrs)} target · {cooldownDays}-day cooldown
              </div>
              <button
                onClick={startFast}
                disabled={starting}
                className="mt-6 w-full bg-gold text-white font-inter font-semibold py-3.5 rounded-2xl text-base hover:bg-brownAccent transition-colors disabled:opacity-60"
              >
                {starting ? 'Starting…' : 'Start Fast'}
              </button>
            </>
          )}
        </section>

        {/* ── Metrics ── */}
        <section className="grid grid-cols-2 gap-3">
          {[
            { value: totalFasts.toString(), label: 'total fasts' },
            { value: formatHrs(totalHrs), label: 'time fasted' },
            { value: formatHrs(longestHrs), label: 'longest fast' },
            { value: formatHrs(avgHrs), label: 'avg duration' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-surface rounded-2xl px-4 py-3.5">
              <div className="font-playfair text-2xl font-bold text-textPrimary leading-none">{value}</div>
              <div className="font-inter text-[11px] text-textMuted mt-1">{label}</div>
            </div>
          ))}
          <div className="bg-surface rounded-2xl px-4 py-3.5 col-span-2 flex items-center justify-between">
            <div>
              <div className="font-inter text-[11px] text-textMuted">last fast</div>
              <div className="font-inter text-sm font-medium text-textPrimary mt-0.5">
                {lastCompleted
                  ? `${formatDate(lastCompleted.ended_at!)} · ${formatHrs(lastCompleted.duration_hrs ?? 0)}`
                  : 'No fasts yet'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-inter text-[11px] text-textMuted">next available</div>
              <div className="font-inter text-sm font-medium text-textPrimary mt-0.5">
                {activeFast ? 'Fasting now' : cooldownActive ? formatRemaining(nextAllowedStart - now) : 'Available now'}
              </div>
            </div>
          </div>
        </section>

        {/* ── Calendar ── */}
        <section>
          <h2 className="font-playfair text-xl font-bold text-textPrimary mb-3">Fasting Calendar</h2>
          <div className="bg-surface rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="text-textMuted hover:text-textPrimary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-playfair font-bold text-textPrimary">
                {MONTH_NAMES[calMonthIdx]} {calYear}
              </span>
              <button
                onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="text-textMuted hover:text-textPrimary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DAY_ABBRS.map(d => (
                <div key={d} className="text-center font-inter text-[11px] text-textMuted py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1
                const dayDate = new Date(calYear, calMonthIdx, dayNum)
                const isToday = isSameDay(dayDate, today)
                const fast = fastOnDay(dayDate)
                const isActiveToday = isToday && !!activeFast
                const cooldown = isCooldownDay(dayDate)

                return (
                  <div key={dayNum} className="flex flex-col items-center py-1">
                    <button
                      onClick={() => fast && setDetailFast(fast)}
                      disabled={!fast}
                      className={`w-7 h-7 flex items-center justify-center rounded-full font-inter text-xs transition-colors ${
                        isToday
                          ? 'bg-textPrimary text-white font-bold'
                          : fast
                          ? 'bg-gold text-white font-medium hover:bg-brownAccent'
                          : cooldown
                          ? 'bg-grid/25 text-textMuted'
                          : 'text-textPrimary'
                      }`}
                    >
                      {dayNum}
                    </button>
                    <div className="h-1.5 mt-0.5">
                      {isActiveToday && <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-grid/20">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gold" />
                <span className="font-inter text-[10px] text-textMuted">Completed fast</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-grid/40" />
                <span className="font-inter text-[10px] text-textMuted">Cooldown</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Guidelines ── */}
        <section>
          <h2 className="font-playfair text-xl font-bold text-textPrimary mb-3">Guidelines</h2>
          <div className="space-y-2.5">
            {GUIDELINES.map((g, i) => (
              <div key={i} className="bg-surface rounded-xl px-4 py-3.5">
                <div className="font-inter text-sm font-semibold text-textPrimary">{g.title}</div>
                <div className="font-inter text-sm text-textMuted leading-relaxed mt-1">{g.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQs ── */}
        <section>
          <h2 className="font-playfair text-xl font-bold text-textPrimary mb-3">FAQ</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-surface rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                >
                  <span className="font-inter text-sm font-medium text-textPrimary pr-4">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-textMuted flex-shrink-0 transition-transform duration-200 ${
                    openFaq === i ? 'rotate-180' : ''
                  }`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 pt-0 font-inter text-sm text-textMuted leading-relaxed border-t border-grid/20">
                    <div className="pt-3">{item.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ── End Fast dialog ── */}
      <Dialog.Root open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-beige border border-gold rounded-2xl p-6 z-[70] w-[min(90vw,400px)] shadow-xl">
            <Dialog.Title className="font-playfair text-2xl font-bold text-textPrimary mb-1">
              End Fast
            </Dialog.Title>
            {activeFast && (
              <Dialog.Description className="font-inter text-sm text-textMuted mb-4">
                {formatHrs(elapsedSeconds / 3600)} · started {formatDateTime(activeFast.started_at)}
              </Dialog.Description>
            )}
            <label className="font-inter text-sm text-textPrimary block mb-2">
              {settings?.notes_prompt ?? 'How did this fast go?'}
            </label>
            <textarea
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              rows={3}
              className="w-full font-inter text-sm text-textPrimary bg-surface rounded-xl px-3 py-2 border border-grid/30 focus:outline-none focus:border-gold resize-none"
              placeholder="Optional notes…"
            />
            <div className="flex gap-2 mt-5">
              <Dialog.Close asChild>
                <button className="flex-1 py-3 rounded-xl border border-grid/40 text-textMuted font-inter font-medium hover:bg-surface transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={confirmEndFast}
                disabled={ending}
                className="flex-1 py-3 bg-gold text-white rounded-xl font-inter font-medium hover:bg-brownAccent transition-colors disabled:opacity-60"
              >
                {ending ? 'Saving…' : 'End Fast'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Fast detail drawer ── */}
      <Dialog.Root open={!!detailFast} onOpenChange={open => !open && setDetailFast(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed bottom-0 left-0 right-0 bg-beige rounded-t-3xl p-6 z-[70] max-w-lg mx-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="font-playfair text-2xl font-bold text-textPrimary">
                {settings?.fast_label ?? 'Controlled Fast'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-textMuted hover:text-textPrimary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            {detailFast && (
              <div className="space-y-3">
                <div className="flex items-center justify-between font-inter text-sm">
                  <span className="text-textMuted">Duration</span>
                  <span className="text-textPrimary font-medium">{formatHrs(detailFast.duration_hrs ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between font-inter text-sm">
                  <span className="text-textMuted">Started</span>
                  <span className="text-textPrimary font-medium">{formatDateTime(detailFast.started_at)}</span>
                </div>
                <div className="flex items-center justify-between font-inter text-sm">
                  <span className="text-textMuted">Ended</span>
                  <span className="text-textPrimary font-medium">{formatDateTime(detailFast.ended_at!)}</span>
                </div>
                {detailFast.notes && (
                  <div className="pt-3 border-t border-grid/20">
                    <div className="font-inter text-xs text-textMuted mb-1">Notes</div>
                    <div className="font-inter text-sm text-textPrimary leading-relaxed">{detailFast.notes}</div>
                  </div>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  )
}
