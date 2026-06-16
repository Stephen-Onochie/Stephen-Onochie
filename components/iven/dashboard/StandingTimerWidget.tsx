'use client'

import { useStandingTimer } from '@/hooks/useStandingTimer'
import Link from 'next/link'

function Ring({ pct, size, sw, color }: { pct: number; size: number; sw: number; color: string }) {
  const r = (size - sw) / 2 - 1
  const c = 2 * Math.PI * r
  const off = c * (1 - pct / 100)
  const cx = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--iven-grid)" strokeWidth={sw} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={sw}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset .5s ease' }}
      />
    </svg>
  )
}

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function StandingTimerWidget() {
  const timer = useStandingTimer()

  const isStanding = timer.state?.current_mode === 'standing'
  const accentColor = isStanding ? 'var(--iven-accent)' : 'var(--iven-muted)'
  const statusLabel = timer.state?.current_mode === 'standing' ? 'STANDING' : timer.state?.current_mode === 'sitting' ? 'SEATED' : 'IDLE'

  const standingToday = timer.stats?.today.standing ?? 0
  const goalSeconds = (timer.settings?.standing_minutes ?? 30) * 60
  const pct = goalSeconds > 0 ? Math.min(100, Math.round((standingToday / goalSeconds) * 100)) : 0
  const remainMin = Math.max(0, Math.round((timer.remainingSeconds ?? 0) / 60))

  return (
    <div
      className="rounded-[18px] p-6"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase mb-4" style={{ color: 'var(--iven-accent)' }}>
        STANDING TIMER
      </div>
      {timer.loading ? (
        <div className="h-20 rounded-lg animate-pulse" style={{ background: 'var(--iven-grid)', opacity: 0.3 }} />
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <Ring pct={pct} size={88} sw={6} color={accentColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-[9px] tracking-[1.5px]" style={{ color: 'var(--iven-accent)' }}>{statusLabel}</span>
              <span className="font-mono text-lg font-semibold" style={{ color: 'var(--iven-text)' }}>{remainMin}m</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="font-mono text-[9.5px] tracking-[1.5px] mb-1" style={{ color: 'var(--iven-muted)' }}>TODAY · STANDING</div>
            <div className="font-mono text-xl font-semibold mb-1" style={{ color: 'var(--iven-text)' }}>{fmt(standingToday)}</div>
            <div className="font-mono text-[9.5px] mb-3" style={{ color: 'var(--iven-muted)' }}>
              GOAL {fmt(goalSeconds)} · {pct}%
            </div>
            <Link
              href="/apps/standing-timer"
              className="inline-block font-mono text-[10px] tracking-[1.5px] font-semibold rounded-lg px-3 py-2"
              style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}
            >
              OPEN TIMER
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
