import type { DailyPoint } from '@/types/health'

export function average(points: DailyPoint[]): number {
  if (!points.length) return 0
  return points.reduce((a, b) => a + b.value, 0) / points.length
}

export function peak(points: DailyPoint[]): number {
  return points.reduce((m, p) => Math.max(m, p.value), 0)
}

export interface Delta {
  pct: number
  label: string
  good: boolean
  neutral: boolean
}

// Last-7-day average vs the prior 7. lowerIsBetter flips the sentiment
// (resting HR going down is an improvement).
export function weekDelta(series: DailyPoint[], lowerIsBetter = false): Delta {
  const last7 = series.slice(-7)
  const prev7 = series.slice(-14, -7)
  const curr = average(last7)
  const prev = average(prev7)
  const pct = prev ? ((curr - prev) / prev) * 100 : 0
  const up = pct >= 0
  const neutral = Math.abs(pct) < 0.6
  const good = lowerIsBetter ? !up : up
  return {
    pct,
    label: `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`,
    good,
    neutral,
  }
}
