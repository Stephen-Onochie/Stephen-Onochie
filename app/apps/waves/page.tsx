'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/apps/AppHeader'
import Link from 'next/link'
import { Settings, ChevronLeft, ChevronRight, Check, X, Calendar, ChevronDown } from 'lucide-react'
import type { WavesSession, WavesSettings, SessionType } from '@/types/waves'

// ─── Config ───────────────────────────────────────────────────────

const DAY_ABBRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SESSION_CONFIG = {
  morning: {
    label: 'Morning',
    emoji: '🌅',
    defaultDuration: 15,
    dot: 'bg-amber-400',
    steps: [
      'Remove durag carefully',
      'Mist hair lightly with water or leave-in spray',
      'Apply a small amount of pomade or butter',
      'Brush for 15 minutes using medium/soft brush',
      '(Optional) Wear durag for 30–60 mins if at home',
    ],
  },
  afternoon: {
    label: 'Afternoon',
    emoji: '☀️',
    defaultDuration: 20,
    dot: 'bg-orange-400',
    steps: [
      'Mist hair if it feels dry',
      'Apply light moisturizer or pomade as needed',
      'Brush for 20 minutes, reinforcing your wave pattern',
      '(Optional) Short durag or wave cap session (30–60 mins)',
    ],
  },
  evening: {
    label: 'Evening',
    emoji: '🌙',
    defaultDuration: 25,
    dot: 'bg-indigo-400',
    steps: [
      'Brush for 25 minutes — the most productive session',
      'Apply moisturizer + pomade generously',
      'Final brush to lay hair down flat',
      'Tie on durag tightly (velvet/silk preferred)',
      'Sleep with durag on every night',
    ],
  },
  wash: {
    label: 'Wash Day',
    emoji: '💧',
    defaultDuration: 30,
    dot: 'bg-cyan-400',
    steps: [
      'Comb hair gently in wave direction',
      'Wet hair thoroughly',
      'Apply shampoo, lather, and rinse (double wash if needed)',
      'Deep condition — leave in 5–15 minutes',
      'Towel dry lightly (damp is best)',
      'Apply moisturizer + pomade',
      'Brush 20–30 minutes while damp',
      'Put on durag (optional: plastic bag underneath for moisture)',
      'Air dry or wear durag overnight before removing',
    ],
  },
} satisfies Record<SessionType, { label: string; emoji: string; defaultDuration: number; dot: string; steps: string[] }>

const FAQ_ITEMS = [
  {
    q: 'How long until I see waves?',
    a: 'Visible ripples typically appear in 1–4 weeks. Deeper, connected 360 waves take 1–3+ months with daily consistency.',
  },
  {
    q: 'How often should I wash my hair?',
    a: '1–2 times per week using sulfate-free shampoo. Over-washing strips natural oils and causes dryness that works against wave formation.',
  },
  {
    q: 'What is wolfing and should I do it?',
    a: "Wolfing means growing your hair out 4–8 weeks between cuts to deepen waves. It's the most effective phase — resist the urge to cut early.",
  },
  {
    q: 'How important is the durag?',
    a: 'Skipping the durag at night is the #1 progress killer. It compresses your wave pattern while you sleep. Always wear it every night.',
  },
  {
    q: 'Should I brush with or without product?',
    a: 'Always brush with moisturizer or pomade applied first. Dry brushing causes breakage and friction that damages your hair cuticle.',
  },
  {
    q: 'What if I have forks or breaks in my pattern?',
    a: 'Stick to consistent brushing angles, increase durag compression, and use the Wash & Style method to reset. Expect 4–8 weeks to correct.',
  },
  {
    q: 'How do I brush in the right direction?',
    a: 'Start from the crown and brush outward following your natural hair growth pattern. Use a hand mirror to check your sides and back.',
  },
  {
    q: 'Why is my progress slow?',
    a: "Confirm you're hitting 60 min/day of brushing, wearing the durag every night, and moisturizing before every session. Wolf longer (6+ weeks) for deeper waves.",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatMmSs(seconds: number) {
  const m = Math.floor(Math.abs(seconds) / 60).toString().padStart(2, '0')
  const s = (Math.abs(seconds) % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function getSessionDuration(type: SessionType, settings: WavesSettings | null): number {
  if (!settings) return SESSION_CONFIG[type].defaultDuration
  if (type === 'morning') return settings.morning_duration_mins
  if (type === 'afternoon') return settings.afternoon_duration_mins
  if (type === 'evening') return settings.evening_duration_mins
  return 30
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
  const pad = (n: number) => n.toString().padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  const details = encodeURIComponent(
    includeTrim
      ? 'Low Fade + Trim. Clean up the edges and shape-up. Trim split ends to keep hair healthy for wave progress.'
      : 'Low Fade. Clean up the edges and shape-up. Keep enough length for wave progress — just a clean fade.',
  )
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Haircut @ Juve's")}&details=${details}&dates=${fmt(date)}/${fmt(next)}`
}

function calculateStreak(sessions: WavesSession[]) {
  const dates = new Set(sessions.map(s => s.session_date))
  const cursor = new Date()
  let streak = 0
  while (true) {
    const str = cursor.toISOString().slice(0, 10)
    if (!dates.has(str)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
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
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [targetSeconds, setTargetSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const [calMonth, setCalMonth] = useState(() => new Date())
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
      .gte('session_date', since.toISOString().slice(0, 10))
    setRecentSessions(recentData ?? [])

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!timerRunning) return
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setTimerRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timerRunning])

  function startSession(type: SessionType) {
    const dur = getSessionDuration(type, settings)
    setActiveSession(type)
    setTargetSeconds(dur * 60)
    setTimerSeconds(dur * 60)
    setCompletedSteps(new Set())
    setTimerRunning(true)
  }

  async function completeSession() {
    if (!activeSession) return
    setTimerRunning(false)
    const brushingSeconds = Math.max(targetSeconds - timerSeconds, 0)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('waves_sessions').insert({
      user_id: session.user.id,
      session_type: activeSession,
      brushing_seconds: brushingSeconds,
      session_date: todayStr(),
    })

    setActiveSession(null)
    setTimerSeconds(0)
    await loadData()
  }

  function cancelSession() {
    setTimerRunning(false)
    setActiveSession(null)
    setTimerSeconds(0)
    setCompletedSteps(new Set())
  }

  function toggleStep(i: number) {
    setCompletedSteps(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-beige">
        <AppHeader title="Project Waves" />
        <div className="max-w-lg mx-auto px-4 pt-8 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      </main>
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
  const progress = targetSeconds > 0 ? (targetSeconds - timerSeconds) / targetSeconds : 0

  return (
    <main className="min-h-screen bg-beige pb-12">
      <AppHeader
        title="Project Waves"
        right={
          <Link href="/apps/waves/settings" className="text-textMuted hover:text-textPrimary transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        }
      />

      {/* ── Active Session Overlay ── */}
      {activeSession && cfg && (
        <div className="fixed inset-0 bg-textPrimary z-50 flex flex-col">
          <div className="flex items-center justify-between px-6 pt-14 pb-4">
            <button onClick={cancelSession} className="text-white/50 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="text-3xl">{cfg.emoji}</div>
              <div className="text-white font-playfair text-lg font-bold">{cfg.label}</div>
            </div>
            <div className="w-6" />
          </div>

          <div className="flex flex-col items-center px-6 pb-4">
            <div className="font-mono text-8xl font-bold text-white tracking-tight tabular-nums">
              {formatMmSs(timerSeconds)}
            </div>
            <div className="text-white/40 font-inter text-sm mt-1">
              {getSessionDuration(activeSession, settings)} min session
            </div>
            <div className="w-full bg-white/10 rounded-full h-1 mt-5 mb-4">
              <div
                className="bg-gold h-1 rounded-full transition-all duration-1000"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <button
              onClick={() => setTimerRunning(r => !r)}
              className="px-8 py-2 rounded-full border border-white/20 text-white font-inter text-sm hover:bg-white/10 transition-colors"
            >
              {timerRunning ? 'Pause' : 'Resume'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pt-2">
            <div className="text-white/40 font-inter text-xs uppercase tracking-widest mb-3">Steps</div>
            <div className="space-y-3 pb-4">
              {cfg.steps.map((step, i) => (
                <button
                  key={i}
                  onClick={() => toggleStep(i)}
                  className="w-full flex items-start gap-3 text-left"
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                    completedSteps.has(i) ? 'bg-gold border-gold' : 'border-white/30'
                  }`}>
                    {completedSteps.has(i) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`font-inter text-sm leading-relaxed ${
                    completedSteps.has(i) ? 'text-white/30 line-through' : 'text-white/80'
                  }`}>
                    {step}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 pb-10 pt-4">
            <button
              onClick={completeSession}
              className="w-full bg-gold text-white font-inter font-semibold py-4 rounded-2xl text-base hover:bg-goldLight transition-colors"
            >
              Complete Session
            </button>
          </div>
        </div>
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
              <span className="text-xs font-inter font-normal text-textMuted">/60</span>
            </div>
            <div className="font-inter text-[11px] text-textMuted">min brushing</div>
          </div>
          <div className="w-px h-10 bg-grid" />
          <div className="text-center">
            <div className="font-playfair text-xl font-bold text-textPrimary leading-none">
              {completedTypes.size}
              <span className="text-xs font-inter font-normal text-textMuted">/3</span>
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
              const dur = getSessionDuration(type, settings)
              const c = SESSION_CONFIG[type]
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
                    <div className="font-inter text-xs text-textMuted">{dur} min brushing</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {done && (
                      <span className="flex items-center gap-1 text-gold font-inter text-xs font-medium">
                        <Check className="w-4 h-4" />
                        Done
                      </span>
                    )}
                    <button
                      onClick={() => startSession(type)}
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
                      <span className="font-inter font-semibold text-textPrimary text-sm">Wash Day</span>
                      {isWashDay && (
                        <span className="bg-cyan-500 text-white font-inter text-[10px] font-bold px-2 py-0.5 rounded-full">
                          TODAY
                        </span>
                      )}
                    </div>
                    <div className="font-inter text-xs text-textMuted">
                      {isWashDay ? 'Full wash & style routine' : `Every ${washDayName}`}
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
                      onClick={() => startSession('wash')}
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
                const dateStr = dayDate.toISOString().slice(0, 10)
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
                { dot: 'bg-orange-400', label: 'Afternoon' },
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

          {/* Upcoming haircuts */}
          {upcomingHaircuts.length > 0 && (
            <div className="mt-3 space-y-2">
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
    </main>
  )
}
