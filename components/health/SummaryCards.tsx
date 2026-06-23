'use client'

import type { FeaturedSeries } from '@/types/health'
import { average, weekDelta } from '@/lib/health/stats'

interface StatCard {
  label: string
  value: string
  unit: string
  deltaLabel: string
  deltaColor: string
}

function deltaColor(good: boolean, neutral: boolean): string {
  if (neutral) return 'var(--iven-muted)'
  return good ? '#5E7A4E' : '#B5532E'
}

export default function SummaryCards({ data }: { data: FeaturedSeries }) {
  const stepsD = weekDelta(data.steps)
  const sleepD = weekDelta(data.sleep)
  const hrvD = weekDelta(data.hrv)
  const rhrD = weekDelta(data.restingHr, true)

  const cards: StatCard[] = [
    {
      label: 'Avg Steps',
      value: Math.round(average(data.steps.slice(-7))).toLocaleString(),
      unit: '/day',
      deltaLabel: stepsD.label,
      deltaColor: deltaColor(stepsD.good, stepsD.neutral),
    },
    {
      label: 'Avg Sleep',
      value: average(data.sleep.slice(-7)).toFixed(1),
      unit: 'hrs',
      deltaLabel: sleepD.label,
      deltaColor: deltaColor(sleepD.good, sleepD.neutral),
    },
    {
      label: 'Avg HRV',
      value: Math.round(average(data.hrv.slice(-7))).toString(),
      unit: 'ms',
      deltaLabel: hrvD.label,
      deltaColor: deltaColor(hrvD.good, hrvD.neutral),
    },
    {
      label: 'Resting HR',
      value: Math.round(average(data.restingHr.slice(-7))).toString(),
      unit: 'bpm',
      deltaLabel: rhrD.label,
      deltaColor: deltaColor(rhrD.good, rhrD.neutral),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-2xl px-[22px] py-5"
          style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
        >
          <div className="font-mono text-[10px] tracking-[2.6px] uppercase" style={{ color: 'var(--iven-muted)' }}>
            {c.label}
          </div>
          <div className="flex items-baseline gap-1.5 mt-3.5">
            <span className="font-inter font-extrabold text-[34px] tracking-[-0.02em]" style={{ color: 'var(--iven-text)' }}>
              {c.value}
            </span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--iven-muted)' }}>
              {c.unit}
            </span>
          </div>
          <div className="flex items-center gap-[7px] mt-3.5">
            <span className="font-inter font-semibold text-[12.5px]" style={{ color: c.deltaColor }}>
              {c.deltaLabel}
            </span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--iven-muted)' }}>
              vs last week
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
