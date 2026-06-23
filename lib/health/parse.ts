import { normalizeMetricName, getMetricDef } from './metrics'

// A single normalized point ready to upsert into health_metrics.
export interface NormalizedPoint {
  metric_type: string
  recorded_at: string
  value: number
  unit: string | null
}

interface RawDataPoint {
  date?: string
  qty?: number
  Avg?: number
  avg?: number
  Min?: number
  Max?: number
  // sleep_analysis interval shape
  sleepStart?: string
  sleepEnd?: string
  startDate?: string
  endDate?: string
  value?: number
  totalSleep?: number
  asleep?: number
}

interface RawMetric {
  name?: string
  units?: string
  data?: RawDataPoint[]
}

interface HealthExportPayload {
  data?: {
    metrics?: RawMetric[]
  }
}

// Pull the numeric value out of a data point. Health Auto Export uses `qty`
// for cumulative metrics and Avg/Min/Max for rates — prefer qty, then Avg.
function pointValue(p: RawDataPoint): number | null {
  if (typeof p.qty === 'number') return p.qty
  if (typeof p.Avg === 'number') return p.Avg
  if (typeof p.avg === 'number') return p.avg
  if (typeof p.value === 'number') return p.value
  return null
}

function pointDate(p: RawDataPoint): string | null {
  const raw = p.date ?? p.startDate ?? p.sleepStart
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// sleep_analysis arrives as session intervals; collapse each into hours.
function sleepHours(p: RawDataPoint): number | null {
  if (typeof p.totalSleep === 'number') return p.totalSleep
  if (typeof p.asleep === 'number') return p.asleep
  if (typeof p.qty === 'number') return p.qty
  const start = p.sleepStart ?? p.startDate
  const end = p.sleepEnd ?? p.endDate
  if (start && end) {
    const ms = new Date(end).getTime() - new Date(start).getTime()
    if (!isNaN(ms) && ms > 0) return ms / 3_600_000
  }
  return null
}

export function parseHealthExport(payload: HealthExportPayload): NormalizedPoint[] {
  const metrics = payload?.data?.metrics
  if (!Array.isArray(metrics)) return []

  const out: NormalizedPoint[] = []
  for (const metric of metrics) {
    if (!metric?.name || !Array.isArray(metric.data)) continue
    const type = normalizeMetricName(metric.name)
    const unit = metric.units ?? getMetricDef(type).unit ?? null
    const isSleep = type === 'sleep_duration'

    for (const point of metric.data) {
      const recorded_at = pointDate(point)
      if (!recorded_at) continue
      const value = isSleep ? sleepHours(point) : pointValue(point)
      if (value === null) continue
      out.push({ metric_type: type, recorded_at, value, unit })
    }
  }
  return out
}
