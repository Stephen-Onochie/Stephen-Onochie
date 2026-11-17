'use client'

import type { ApplyPace } from '@/lib/internship/reminders'

export default function ApplyTracker({ pace, bumpKey }: { pace: ApplyPace; bumpKey: number }) {
  const pct = Math.min(100, Math.round((pace.week / Math.max(1, pace.weekTarget)) * 100))
  const hitGoal = pace.week >= pace.weekTarget

  return (
    <div
      key={`glow-${bumpKey}`}
      data-apply-tracker
      className={`flex items-stretch rounded-xl overflow-hidden ${bumpKey ? 'iven-tracker-glow' : ''}`}
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}
      aria-label={`${pace.today} applied today, ${pace.week} of ${pace.weekTarget} this week`}
    >
      <Stat label="Today" value={pace.today} bumpKey={bumpKey} />
      <div style={{ width: 1, background: 'var(--iven-grid)' }} />
      <div className="flex flex-col justify-center px-4 py-2 min-w-[120px]">
        <div className="font-mono text-[9px] font-semibold tracking-[2px] uppercase" style={{ color: 'var(--iven-muted)' }}>
          This week
        </div>
        <div className="flex items-baseline gap-1 leading-none mt-1">
          <span
            key={`w-${bumpKey}`}
            className={`font-mono font-bold text-[22px] ${bumpKey ? 'iven-count-pop' : ''}`}
            style={{ color: 'var(--iven-text)' }}
          >
            {pace.week}
          </span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--iven-muted)' }}>
            / {pace.weekTarget}
          </span>
        </div>
        <div className="h-[3px] rounded-full mt-1.5 overflow-hidden" style={{ background: 'var(--iven-grid)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: hitGoal ? '#7C8C5A' : 'var(--iven-accent)',
              transition: 'width 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, bumpKey }: { label: string; value: number; bumpKey: number }) {
  return (
    <div className="flex flex-col justify-center px-4 py-2">
      <div className="font-mono text-[9px] font-semibold tracking-[2px] uppercase" style={{ color: 'var(--iven-muted)' }}>
        {label}
      </div>
      <span
        key={`t-${bumpKey}`}
        className={`font-mono font-bold text-[22px] leading-none mt-1 ${bumpKey ? 'iven-count-pop' : ''}`}
        style={{ color: 'var(--iven-text)' }}
      >
        {value}
      </span>
    </div>
  )
}
