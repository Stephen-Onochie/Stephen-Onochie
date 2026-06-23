'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReadingSession } from '@/types/reading'
import Link from 'next/link'

function todayStr() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function computeStreak(dates: string[]): number {
  const set = new Set(dates)
  if (!set.size) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayS = today.toISOString().slice(0, 10)
  const yest = new Date(today)
  yest.setDate(today.getDate() - 1)
  const yestS = yest.toISOString().slice(0, 10)
  if (!set.has(todayS) && !set.has(yestS)) return 0
  let streak = 0
  const cursor = new Date(set.has(todayS) ? today : yest)
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function ReadingWidget() {
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<ReadingSession[]>([])
  const [goal, setGoal] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const [{ data: rows }, { data: settings }] = await Promise.all([
        supabase
          .from('reading_sessions')
          .select('*')
          .eq('user_id', session.user.id)
          .not('ended_at', 'is', null)
          .order('session_date', { ascending: false })
          .limit(200),
        supabase
          .from('reading_settings')
          .select('daily_goal_minutes')
          .eq('user_id', session.user.id)
          .maybeSingle(),
      ])
      if (rows) setSessions(rows as ReadingSession[])
      if (settings?.daily_goal_minutes) setGoal(settings.daily_goal_minutes)
      setLoading(false)
    }
    load()
  }, [supabase])

  const minutesToday = sessions
    .filter(s => s.session_date === todayStr())
    .reduce((sum, s) => sum + (s.minutes ?? 0), 0)
  const streak = computeStreak(sessions.map(s => s.session_date))
  const pct = Math.min(Math.round((minutesToday / goal) * 100), 100)

  return (
    <div
      className="rounded-[18px] p-6 flex flex-col"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)', flex: 1 }}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase" style={{ color: 'var(--iven-accent)' }}>
          READING
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-xl font-bold" style={{ color: 'var(--iven-accent)' }}>{loading ? '–' : streak}</span>
          <span className="font-mono text-[9px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>DAY STREAK</span>
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="font-mono text-3xl font-bold" style={{ color: 'var(--iven-text)' }}>
          {loading ? '–' : minutesToday}
        </span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--iven-muted)' }}>/ {goal} min today</span>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--iven-grid)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${loading ? 0 : pct}%`, background: 'var(--iven-accent)' }} />
      </div>

      <Link
        href="/apps/reading"
        className="font-mono text-[9px] tracking-[1.5px] uppercase mt-3 self-end transition-colors"
        style={{ color: 'var(--iven-muted)' }}
      >
        OPEN READING →
      </Link>
    </div>
  )
}
