'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { DailyPoint } from '@/types/health'

export default function HealthRecoveryWidget() {
  const [hrv, setHrv] = useState<DailyPoint[]>([])
  const [rhr, setRhr] = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/health-data?metric=hrv&range=7d').then(r => (r.ok ? r.json() : null)),
      fetch('/api/health-data?metric=resting_heart_rate&range=7d').then(r => (r.ok ? r.json() : null)),
    ])
      .then(([h, r]) => {
        if (h?.series) setHrv(h.series)
        if (r?.series) setRhr(r.series)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const latestHrv = hrv.length ? Math.round(hrv[hrv.length - 1].value) : null
  const latestRhr = rhr.length ? Math.round(rhr[rhr.length - 1].value) : null

  return (
    <div
      className="rounded-[18px] p-6 flex flex-col h-full"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase mb-4" style={{ color: 'var(--iven-accent)' }}>
        RECOVERY
      </div>

      <div className="flex-1 flex items-center justify-around gap-4">
        <div className="text-center">
          <div className="font-mono text-3xl font-bold" style={{ color: 'var(--iven-text)' }}>
            {loading ? '–' : latestHrv ?? '–'}
          </div>
          <div className="font-mono text-[9px] tracking-[1.5px] mt-1" style={{ color: 'var(--iven-muted)' }}>
            HRV · MS
          </div>
        </div>
        <div className="w-px self-stretch" style={{ background: 'var(--iven-grid)' }} />
        <div className="text-center">
          <div className="font-mono text-3xl font-bold" style={{ color: 'var(--iven-text)' }}>
            {loading ? '–' : latestRhr ?? '–'}
          </div>
          <div className="font-mono text-[9px] tracking-[1.5px] mt-1" style={{ color: 'var(--iven-muted)' }}>
            RHR · BPM
          </div>
        </div>
      </div>

      <Link href="/apps/health" className="font-mono text-[9px] tracking-[1.5px] uppercase mt-3 self-end" style={{ color: 'var(--iven-muted)' }}>
        VIEW HEALTH →
      </Link>
    </div>
  )
}
