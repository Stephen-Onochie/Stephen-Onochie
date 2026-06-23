'use client'

import type { DateRange } from '@/types/health'

const RANGES: { key: DateRange; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'all', label: 'ALL' },
]

export default function RangeToggle({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (r: DateRange) => void
}) {
  return (
    <div
      className="flex gap-0.5 p-[3px] rounded-[11px]"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      {RANGES.map(r => {
        const on = r.key === value
        return (
          <button
            key={r.key}
            onClick={() => onChange(r.key)}
            className="font-mono text-[11px] tracking-[1.4px] uppercase px-4 py-[7px] rounded-lg transition-all"
            style={{
              background: on ? 'var(--iven-accent)' : 'transparent',
              color: on ? 'var(--iven-bg)' : 'var(--iven-muted)',
              fontWeight: on ? 600 : 400,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}
