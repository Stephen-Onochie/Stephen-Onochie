'use client'

import { formatHoursMinutes, totalSeconds } from '@/lib/standing-timer/stats'
import { MODE_ICONS, MODE_LABELS } from '@/lib/standing-timer/cycle'
import type { ModeStats, PeriodStats } from '@/types/standing-timer'

interface StatsViewProps {
  stats: PeriodStats | null
  loading: boolean
}

function ModeBreakdown({ label, data }: { label: string; data: ModeStats }) {
  const total = totalSeconds(data) || 1

  const rows = (['standing', 'sitting', 'break'] as const).map((mode) => ({
    mode,
    seconds: data[mode],
    pct: Math.round((data[mode] / total) * 100),
  }))

  return (
    <div className="bg-surface rounded-2xl p-5">
      <h3 className="font-playfair text-lg font-bold text-textPrimary mb-4">{label}</h3>
      <div className="space-y-4">
        {rows.map(({ mode, seconds, pct }) => (
          <div key={mode}>
            <div className="flex justify-between text-sm font-inter mb-1">
              <span className="text-textPrimary">
                {MODE_ICONS[mode]} {MODE_LABELS[mode]}
              </span>
              <span className="text-textMuted">
                {formatHoursMinutes(seconds)} · {pct}%
              </span>
            </div>
            <div className="h-2 bg-beige rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-textMuted font-inter text-xs mt-4">
        Total tracked: {formatHoursMinutes(totalSeconds(data))}
      </p>
    </div>
  )
}

export default function StatsView({ stats, loading }: StatsViewProps) {
  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-2xl h-40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-textMuted font-inter text-sm">No stats yet. Complete a session to see data.</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 max-w-lg mx-auto">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-2xl p-4 text-center">
          <p className="text-textMuted font-inter text-xs uppercase tracking-wide">Sessions</p>
          <p className="font-playfair text-3xl font-bold text-textPrimary mt-1">{stats.sessionCount}</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 text-center">
          <p className="text-textMuted font-inter text-xs uppercase tracking-wide">Intervals</p>
          <p className="font-playfair text-3xl font-bold text-textPrimary mt-1">{stats.intervalCount}</p>
        </div>
      </div>

      <ModeBreakdown label="All time" data={stats.allTime} />
      <ModeBreakdown label="This month" data={stats.thisMonth} />
      <ModeBreakdown label="This week" data={stats.thisWeek} />
      <ModeBreakdown label="Today" data={stats.today} />
    </div>
  )
}
