'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DailyPoint } from '@/types/health'

export default function HealthStepsWidget() {
  const [series, setSeries] = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health-data?metric=steps&range=7d')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.series) setSeries(d.series)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const today = series.length ? series[series.length - 1].value : 0
  const max = Math.max(...series.map(s => s.value), 1)

  return (
    <div
      className="rounded-[18px] p-6 flex flex-col h-full"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase" style={{ color: 'var(--iven-accent)' }}>
          STEPS
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-xl font-bold" style={{ color: 'var(--iven-accent)' }}>
            {loading ? '–' : today.toLocaleString()}
          </span>
          <span className="font-mono text-[9px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
            TODAY
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 min-h-12 rounded-lg animate-pulse" style={{ background: 'var(--iven-grid)', opacity: 0.3 }} />
      ) : (
        <div className="flex items-end gap-[3px] flex-1 min-h-12">
          {series.map((bar, i) => (
            <div
              key={i}
              className="flex-1 rounded-[3px]"
              style={{
                height: `${Math.max(15, Math.round((bar.value / max) * 100))}%`,
                background: i === series.length - 1 ? 'var(--iven-accent)' : 'color-mix(in srgb, var(--iven-accent) 45%, transparent)',
              }}
            />
          ))}
        </div>
      )}

      <Link href="/apps/health" className="font-mono text-[9px] tracking-[1.5px] uppercase mt-3 self-end" style={{ color: 'var(--iven-muted)' }}>
        VIEW HEALTH →
      </Link>
    </div>
  )
}
