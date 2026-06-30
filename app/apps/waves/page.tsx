'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import IvenModule from '@/components/iven/IvenModule'
import SessionRunner from '@/components/iven/waves/SessionRunner'
import Link from 'next/link'
import { Settings, ChevronLeft, ChevronRight, Check, Calendar, ChevronDown } from 'lucide-react'
import type { WavesSession, WavesSettings, SessionType, SessionStep, StrokeLog, BrushType } from '@/types/waves'
import { easternDateStr, addDaysToDateStr } from '@/lib/dates'

// ─── Config ───────────────────────────────────────────────────────

const DAY_ABBRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SESSION_CONFIG = {
  morning: {
    label: 'Morning Grind',
    emoji: '🌅',
    dot: 'bg-amber-400',
    steps: [
      { kind: 'timed', text: 'Unrag & comb completely through your pattern to detangle', durationSecs: 180 },
      { kind: 'plain', text: 'Apply a dime-sized amount of wave butter or natural hair oil' },
      { kind: 'brush', text: 'Pull the body of the hair down — 100 strokes per angle', brush: 'medium', strokesPerAngle: 100 },
      { kind: 'brush', text: 'Polish the top layer to kill frizz — 75 strokes per angle', brush: 'soft', strokesPerAngle: 75 },
      { kind: 'timed', text: 'Plastic bag — wipe down your pattern to kill frizz', durationSecs: 120 },
      { kind: 'plain', text: 'Compress: put the durag on tight' },
    ],
  },
  afternoon: {
    label: 'The Workday',
    emoji: '🏢',
    dot: 'bg-orange-400',
    steps: [
      { kind: 'plain', text: 'Do absolutely nothing. Do not brush it dry.' },
      { kind: 'plain', text: 'Avoid wearing a hat if you can. Let it rest.' },
      { kind: 'plain', text: 'Your hair is laid flat — leave it until the evening session.' },
    ],
  },
  evening: {
    label: 'Evening Training',
    emoji: '🌙',
    dot: 'bg-indigo-400',
    steps: [
      { kind: 'timed', text: 'Comb your pattern out completely', durationSecs: 300 },
      { kind: 'brush', text: 'Dig to the scalp to shift the root — 100 strokes per angle', brush: 'hard', strokesPerAngle: 100 },
      { kind: 'brush', text: 'Pull the body of the hair down — 100 strokes per angle', brush: 'medium', strokesPerAngle: 100 },
      { kind: 'brush', text: 'Lay it down — 50 strokes per angle', brush: 'soft', strokesPerAngle: 50 },
      { kind: 'timed', text: 'Plastic bag — wipe down your pattern', durationSecs: 120 },
      { kind: 'plain', text: 'Rag up: put the durag on and sleep in it' },
    ],
  },
  wash: {
    label: 'Wash & Style',
    emoji: '💧',
    dot: 'bg-cyan-400',
    steps: [
      { kind: 'plain', text: 'Wet hair, apply shampoo, roughly scramble-wash, and rinse out' },
      { kind: 'plain', text: 'Apply shampoo again — brush it into your exact pattern with the medium brush until the lather is thick and white' },
      { kind: 'timed', text: 'Brush through the lather in your pattern', durationSecs: 600 },
      { kind: 'plain', text: 'Put the durag on over the lather, tie tight, and rinse under the showerhead until the water runs clear' },
      { kind: 'plain', text: 'Towel-dry the durag. Keep it on. Wait 2–3 hours until hair is 100% bone dry' },
      { kind: 'timed', text: 'Polish: unrag, add a tiny bit of pomade, soft brush', durationSecs: 300 },
      { kind: 'plain', text: 'Plastic bag, then rag back up for sleep' },
    ],
  },
} satisfies Record<SessionType, { label: string; emoji: string; dot: string; steps: SessionStep[] }>

const BRUSH_MECHANICS: { brush: BrushType; label: string; pressure: string; purpose: string }[] = [
  { brush: 'comb', label: 'Comb', pressure: 'Light', purpose: 'Lifts hair off the scalp and detangles. Comb exactly in your wave pattern.' },
  { brush: 'hard', label: 'Hard Brush', pressure: 'Firm', purpose: 'Reaches down to the scalp to shift the root. Press hard enough to feel it, but do not scrape or bleed.' },
  { brush: 'medium', label: 'Medium Brush', pressure: 'Moderate', purpose: 'Pulls the body of the hair down. Firm enough to move the hair, gentle enough to glide.' },
  { brush: 'soft', label: 'Soft Brush', pressure: 'Light', purpose: 'Polishes the top layer. Let the bristles just sweep over the surface to eliminate frizz.' },
]

const HAIRCUT_ROADMAP: { phase: string; title: string; detail: string; date: Date | null }[] = [
  {
    phase: 'Late June',
    title: 'Maintenance Cut',
    detail: '2-guard with the grain (WTG) + a sharp line-up.',
    date: new Date(2026, 5, 27),
  },
  {
    phase: 'July',
    title: 'Strict Wolfing',
    detail: 'No haircuts on top all month. Edge-ups and tapers only.',
    date: null,
  },
  {
    phase: 'Mid-August',
    title: 'Back-to-School Cut',
    detail: '1.5- or 2-guard WTG to reveal the deep 360 pattern before classes.',
    date: new Date(2026, 7, 15),
  },
]

const FAQ_ITEMS = [
  {
    q: 'How long until I see waves?',
    a: 'Visible ripples typically appear in 1–4 weeks. Deeper, connected 360 waves take 1–3+ months with daily consistency.',
  },
  {
    q: 'How often should I wash my hair?',
    a: 'Once a week — the full Sunday wash & style is a factory reset to remove product buildup. Over-washing strips natural oils and works against wave formation.',
  },
  {
    q: 'What is wolfing and should I do it?',
    a: "Wolfing means growing your hair out between cuts to deepen waves. It's the most effective phase — resist the urge to cut the top early.",
  },
  {
    q: 'How important is the durag?',
    a: 'Skipping the durag at night is the #1 progress killer. It compresses your wave pattern while you sleep. Always wear it every night.',
  },
  {
    q: 'Why do my waves fork?',
    a: 'Forks happen where waves crash into each other — usually from rushing your strokes. Slow down to one stroke per second and brush consistently in your pattern.',
  },
  {
    q: 'Should I brush with or without product?',
    a: 'Always brush with moisturizer or pomade applied first. Dry brushing causes breakage and friction that damages your hair cuticle.',
  },
  {
    q: 'Why use a hand mirror?',
    a: 'Never brush blindly. A hand mirror reflecting into your bathroom mirror lets you check your sides, back, and crown so every angle gets even work.',
  },
  {
    q: 'Why is my progress slow?',
    a: 'Confirm you are hitting both daily sessions, wearing the durag every night, and moisturizing before every session. Wolf longer for deeper waves.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────

function todayStr() {
  return easternDateStr(new Date())
}

// Y-M-D for a Date that already represents a calendar cell (built from local
// wall-clock components). Matches the session_date keys without re-zoning.
function cellDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function estimateSessionMins(steps: SessionStep[]): number {
  const secs = steps.reduce((sum, step) => {
    if (step.kind === 'timed') return sum + step.durationSecs
    if (step.kind === 'brush') return sum + step.strokesPerAngle * 5 // 5 angles at ~1 stroke/sec
    return sum
  }, 0)
  return Math.round(secs / 60)
}

function buildGCalUrl(title: string, details: string, date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${fmt(date)}/${fmt(next)}`
}

function getHaircutDates(lastHaircutDate: string, intervalWeeks: number, count: number) {
  const [y, mo, d] = lastHaircutDate.split('-').map(Number)
  const base = new Date(y, mo - 1, d)
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(base)
    date.setDate(date.getDate() + (i + 1) * intervalWeeks * 7)
    return { date, includeTrim: (i + 1) % 2 === 0 }
  })
}

function getGCalUrl(date: Date, includeTrim: boolean) {
  const details = includeTrim
    ? 'Low Fade + Trim. Clean up the edges and shape-up. Trim split ends to keep hair healthy for wave progress.'
    : 'Low Fade. Clean up the edges and shape-up. Keep enough length for wave progress — just a clean fade.'
  return buildGCalUrl("Haircut @ Juve's", details, date)
}

function calculateStreak(sessions: WavesSession[]) {
  const dates = new Set(sessions.map(s => s.session_date))
  let cursor = easternDateStr(new Date())
  let streak = 0
  while (dates.has(cursor)) {
    streak++
    cursor = addDaysToDateStr(cursor, -1)
  }
  return streak
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ─── Page ─────────────────────────────────────────────────────────

export default function WavesPage() {
  const supabase = createClient()

  const [settings, setSettings] = useState<WavesSettings | null>(null)
  const [todaySessions, setTodaySessions] = useState<WavesSession[]>([])
  const [recentSessions, setRecentSessions] = useState<WavesSession[]>([])
  const [loading, setLoading] = useState(true)

  const [activeSession, setActiveSession] = useState<SessionType | null>(null)
  const [calMonth, setCalMonth] = useState(() => new Date())
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mechanicsOpen, setMechanicsOpen] = useState(false)

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    let { data: s } = await supabase
      .from('waves_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (!s) {
      const { data: created } = await supabase
        .from('waves_settings')
        .insert({ user_id: session.user.id })
        .select()
        .single()
      s = created
    }
    setSettings(s)

    const { data: todayData } = await supabase
      .from('waves_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('session_date', todayStr())
    setTodaySessions(todayData ?? [])

    const since = new Date()
    since.setDate(since.getDate() - 90)
    const { data: recentData } = await supabase
      .from('waves_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('session_date', easternDateStr(since))
    setRecentSessions(recentData ?? [])

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  async function completeSession(brushingSeconds: number, strokeLog: StrokeLog) {
    if (!activeSession) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setActiveSession(null)
      return
    }

    const hasStrokes = Object.keys(strokeLog).length > 0
    await supabase.from('waves_sessions').insert({
      user_id: session.user.id,
      session_type: activeSession,
      brushing_seconds: brushingSeconds,
      session_date: todayStr(),
      stroke_log: hasStrokes ? strokeLog : null,
    })

    setActiveSession(null)
    await loadData()
  }

  if (loading) {
    return (
      <IvenModule index={5} title="Project Waves">
        <div className="max-w-lg mx-auto pt-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: 'var(--iven-surface)' }} />
          ))}
        </div>
      </IvenModule>
    )
  }

  const today = new Date()
  const isWashDay = (settings?.wash_day ?? 0) === today.getDay()
  const completedTypes = new Set(todaySessions.map(s => s.session_type as SessionType))
  const totalBrushingMins = Math.floor(
    todaySessions.reduce((sum, s) => sum + s.brushing_seconds, 0) / 60,
  )
  const streak = calculateStreak(recentSessions)
  const haircutDates = getHaircutDates(
    settings?.last_haircut_date ?? '2026-05-30',
    settings?.haircut_interval_weeks ?? 2,
    20,
  )
  const upcomingHaircuts = haircutDates.filter(h => h.date >= today).slice(0, 4)
  const upcomingRoadmap = HAIRCUT_ROADMAP.filter(m => !m.date || m.date >= today)

  const calYear = calMonth.getFullYear()
  const calMonthIdx = calMonth.getMonth()
  const firstDow = new Date(calYear, calMonthIdx, 1).getDay()
  const daysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate()

  const sessionsByDate: Record<string, Set<SessionType>> = {}
  for (const s of recentSessions) {
    if (!sessionsByDate[s.session_date]) sessionsByDate[s.session_date] = new Set()
    sessionsByDate[s.session_date].add(s.session_type as SessionType)
  }

  const cfg = activeSession ? SESSION_CONFIG[activeSession] : null

  return (
    <IvenModule
      index={5}
      title="Project Waves"
      right={
        <Link href="/apps/waves/settings" className="transition-colors" style={{ color: 'var(--iven-muted)' }}>
          <Settings className="w-5 h-5" />
        </Link>
      }
    >

      {/* ── Active Session Runner ── */}
      {activeSession && cfg && (
        <SessionRunner
          emoji={cfg.emoji}
          label={cfg.label}
          steps={cfg.steps}
          onCancel={() => setActiveSession(null)}
          onComplete={completeSession}
        />
      )}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        {/* ── Stats Bar ── */}
        <div className="bg-surface rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <div className="font-playfair text-xl font-bold text-textPrimary leading-none">{streak}</div>
              <div className="font-inter text-[11px] text-textMuted">day streak</div>
            </div>
          </div>
          <div className="w-px h-10 bg-grid" />
          <div className="text-center">
            <div className="font-playfair text-xl font-bold text-textPrimary leading-none">
              {totalBrushingMins}
              <span className="text-xs font-inter font-normal text-textMuted"> min</span>
            </div>
            <div className="font-inter text-[11px] text-textMuted">brushing today</div>
          </div>
          <div className="w-px h-10 bg-grid" />
          <div className="text-center">
            <div className="font-playfair text-xl font-bold text-textPrimary leading-none">
              {completedTypes.size}
            </div>
            <div className="font-inter text-[11px] text-textMuted">sessions today</div>
          </div>
        </div>

        {/* ── Today's Routine ── */}
        <section>
          <h2 className="font-playfair text-xl font-bold text-textPrimary mb-3">Today's Routine</h2>
          <div className="space-y-2.5">
            {(['morning', 'afternoon', 'evening'] as const).map(type => {
              const done = completedTypes.has(type)
              const c = SESSION_CONFIG[type]
              const mins = estimateSessionMins(c.steps)
              return (
                <div
                  key={type}
                  className={`bg-surface rounded-2xl p-4 flex items-center gap-4 border transition-colors ${
                    done ? 'border-gold/40' : 'border-transparent'
                  }`}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1">
                    <div className="font-inter font-semibold text-textPrimary text-sm">{c.label}</div>
                    <div className="font-inter text-xs text-textMuted">
                      {type === 'afternoon' ? 'Let it rest' : `~${mins} min`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {done && (
                      <span className="flex items-center gap-1 text-gold font-inter text-xs font-medium">
                        <Check className="w-4 h-4" />
                        Done
                      </span>
                    )}
                    <button
                      onClick={() => setActiveSession(type)}
                      className="bg-gold text-white font-inter text-sm font-medium px-4 py-2 rounded-xl hover:bg-brownAccent transition-colors"
                    >
                      {done ? 'Again' : 'Start'}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Wash Day */}
            {(() => {
              const done = completedTypes.has('wash')
              const washDayName = DAY_NAMES[settings?.wash_day ?? 0]
              return (
                <div className={`rounded-2xl p-4 flex items-center gap-4 border transition-colors ${
                  isWashDay
                    ? 'bg-cyan-50 border-cyan-200'
                    : done
                    ? 'bg-surface border-gold/40'
                    : 'bg-surface border-transparent'
                }`}>
                  <span className="text-2xl">💧</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-inter font-semibold text-textPrimary text-sm">Wash & Style</span>
                      {isWashDay && (
                        <span className="bg-cyan-500 text-white font-inter text-[10px] font-bold px-2 py-0.5 rounded-full">
                          TODAY
                        </span>
                      )}
                    </div>
                    <div className="font-inter text-xs text-textMuted">
                      {isWashDay ? 'Full factory reset' : `Every ${washDayName}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {done && (
                      <span className="flex items-center gap-1 text-gold font-inter text-xs font-medium">
                        <Check className="w-4 h-4" />
                        Done
                      </span>
                    )}
                    <button
                      onClick={() => setActiveSession('wash')}
                      className={`font-inter text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
                        isWashDay
                          ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                          : 'bg-gold text-white hover:bg-brownAccent'
                      }`}
                    >
                      {done ? 'Again' : 'Start'}
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </section>

        {/* ── Brush Mechanics ── */}
        <section>
          <div className="bg-surface rounded-2xl overflow-hidden">
            <button
              onClick={() => setMechanicsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <div>
                <div className="font-playfair text-lg font-bold text-textPrimary">Brush Mechanics</div>
                <div className="font-inter text-xs text-textMuted">Master the stroke — 1 per second, never blind</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-textMuted flex-shrink-0 transition-transform duration-200 ${
                mechanicsOpen ? 'rotate-180' : ''
              }`} />
            </button>
            {mechanicsOpen && (
              <div className="px-4 pb-4 border-t border-grid/20 pt-3 space-y-3">
                {BRUSH_MECHANICS.map(({ label, pressure, purpose }) => (
                  <div key={label}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-inter text-sm font-semibold text-textPrimary">{label}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-gold">{pressure}</span>
                    </div>
                    <p className="font-inter text-xs text-textMuted leading-relaxed">{purpose}</p>
                  </div>
                ))}
                <div className="pt-2 border-t border-grid/20 space-y-1.5">
                  <p className="font-inter text-xs text-textMuted leading-relaxed">
                    <span className="font-semibold text-textPrimary">Speed:</span> 1 stroke per second. Slow, rhythmic, and intentional — rushing causes forks.
                  </p>
                  <p className="font-inter text-xs text-textMuted leading-relaxed">
                    <span className="font-semibold text-textPrimary">Mirror:</span> Always use a hand mirror reflecting into your bathroom mirror. Never brush blindly.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Hair Calendar ── */}
        <section>
          <h2 className="font-playfair text-xl font-bold text-textPrimary mb-3">Hair Calendar</h2>

          <div className="bg-surface rounded-2xl p-4">
            {/* Month nav */}
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

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_ABBRS.map(d => (
                <div key={d} className="text-center font-inter text-[11px] text-textMuted py-1">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1
                const dayDate = new Date(calYear, calMonthIdx, dayNum)
                const dateStr = cellDateStr(dayDate)
                const isToday = isSameDay(dayDate, today)
                const daySessions = sessionsByDate[dateStr]
                const haircut = haircutDates.find(h => isSameDay(h.date, dayDate))

                return (
                  <div key={dayNum} className="flex flex-col items-center py-1">
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full font-inter text-xs ${
                      isToday
                        ? 'bg-textPrimary text-white font-bold'
                        : haircut
                        ? 'bg-gold/15 text-textPrimary font-medium'
                        : 'text-textPrimary'
                    }`}>
                      {dayNum}
                    </div>
                    <div className="flex gap-0.5 mt-0.5 h-1.5">
                      {daySessions?.has('morning') && <div className="w-1 h-1 rounded-full bg-amber-400" />}
                      {daySessions?.has('afternoon') && <div className="w-1 h-1 rounded-full bg-orange-400" />}
                      {daySessions?.has('evening') && <div className="w-1 h-1 rounded-full bg-indigo-400" />}
                      {daySessions?.has('wash') && <div className="w-1 h-1 rounded-full bg-cyan-400" />}
                      {haircut && !daySessions?.size && (
                        <div className="text-[8px] leading-none -mt-0.5">✂</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-grid/20">
              {[
                { dot: 'bg-amber-400', label: 'Morning' },
                { dot: 'bg-orange-400', label: 'Workday' },
                { dot: 'bg-indigo-400', label: 'Evening' },
                { dot: 'bg-cyan-400', label: 'Wash' },
              ].map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <span className="font-inter text-[10px] text-textMuted">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <span className="font-inter text-[10px] text-textMuted">✂ Haircut</span>
              </div>
            </div>
          </div>

          {/* Road to August */}
          {upcomingRoadmap.length > 0 && (
            <div className="mt-4">
              <h3 className="font-playfair text-lg font-bold text-textPrimary mb-2">Road to August</h3>
              <div className="space-y-2">
                {upcomingRoadmap.map((m, i) => (
                  <div key={i} className="bg-surface rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-gold">{m.phase}</span>
                        <span className="font-inter text-sm font-semibold text-textPrimary">{m.title}</span>
                      </div>
                      <div className="font-inter text-xs text-textMuted leading-relaxed mt-0.5">{m.detail}</div>
                    </div>
                    {m.date && (
                      <a
                        href={buildGCalUrl(`${m.title} @ Juve's`, m.detail, m.date)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-gold font-inter text-xs font-medium hover:text-brownAccent transition-colors flex-shrink-0 mt-0.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Add
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming haircuts */}
          {upcomingHaircuts.length > 0 && (
            <div className="mt-4">
              <h3 className="font-playfair text-lg font-bold text-textPrimary mb-2">Upcoming Cuts</h3>
              <div className="space-y-2">
                {upcomingHaircuts.map(({ date, includeTrim }, i) => {
                  const label = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                  const cutType = includeTrim ? 'Low Fade + Trim' : 'Low Fade'
                  return (
                    <div key={i} className="bg-surface rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="font-inter text-sm font-medium text-textPrimary">✂ {label}</div>
                        <div className="font-inter text-xs text-textMuted">{cutType} · Juve's</div>
                      </div>
                      <a
                        href={getGCalUrl(date, includeTrim)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-gold font-inter text-xs font-medium hover:text-brownAccent transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Add
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── FAQs ── */}
        <section>
          <h2 className="font-playfair text-xl font-bold text-textPrimary mb-3">Wave FAQs</h2>
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
    </IvenModule>
  )
}
