'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WavesSession } from '@/types/waves'
import { easternDateStr, addDaysToDateStr } from '@/lib/dates'
import Link from 'next/link'

function computeStreak(sessions: WavesSession[]): number {
  const dateSet = new Set(sessions.map(s => s.session_date))
  if (!dateSet.size) return 0

  const todayStr = easternDateStr(new Date())
  const yesterdayStr = addDaysToDateStr(todayStr, -1)
  if (!dateSet.has(todayStr) && !dateSet.has(yesterdayStr)) return 0

  let streak = 0
  let cursor = dateSet.has(todayStr) ? todayStr : yesterdayStr
  while (dateSet.has(cursor)) {
    streak++
    cursor = addDaysToDateStr(cursor, -1)
  }
  return streak
}

function last14Bars(sessions: WavesSession[]) {
  const todayStr = easternDateStr(new Date())
  return Array.from({ length: 14 }, (_, i) => {
    const dateStr = addDaysToDateStr(todayStr, -(13 - i))
    const count = sessions.filter(s => s.session_date === dateStr).length
    return { dateStr, count, isToday: i === 13 }
  })
}

export default function WavesStreakWidget() {
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<WavesSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('waves_sessions')
      .select('*')
      .order('session_date', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setSessions(data as WavesSession[])
        setLoading(false)
      })
  }, [])

  const streak = computeStreak(sessions)
  const bars = last14Bars(sessions)
  const maxCount = Math.max(...bars.map(b => b.count), 1)

  return (
    <div
      className="rounded-[18px] p-6 flex flex-col"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)', flex: 1 }}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase" style={{ color: 'var(--iven-accent)' }}>
          PROJECT WAVES
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-xl font-bold" style={{ color: 'var(--iven-accent)' }}>{loading ? '–' : streak}</span>
          <span className="font-mono text-[9px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>DAY STREAK</span>
        </div>
      </div>

      {loading ? (
        <div className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--iven-grid)', opacity: 0.3 }} />
      ) : (
        <div className="flex items-end gap-[3px] h-12">
          {bars.map((bar, i) => (
            <div
              key={i}
              className="flex-1 rounded-[3px]"
              style={{
                height: bar.count > 0 ? `${Math.max(20, Math.round((bar.count / maxCount) * 100))}%` : '15%',
                background: bar.isToday ? 'var(--iven-accent)' : bar.count > 0 ? 'color-mix(in srgb, var(--iven-accent) 45%, transparent)' : 'var(--iven-grid)',
                opacity: bar.count === 0 ? 0.4 : 1,
              }}
            />
          ))}
        </div>
      )}

      <Link
        href="/apps/waves"
        className="font-mono text-[9px] tracking-[1.5px] uppercase mt-3 self-end transition-colors"
        style={{ color: 'var(--iven-muted)' }}
      >
        VIEW WAVES →
      </Link>
    </div>
  )
}
