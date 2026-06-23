import type { SupabaseClient } from '@supabase/supabase-js'
import type { DailyPoint, DateRange, Aggregation } from '@/types/health'
import { getMetricDef } from './metrics'

export function rangeToDays(range: DateRange): number | null {
  if (range === '7d') return 7
  if (range === '30d') return 30
  if (range === '90d') return 90
  return null // 'all'
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

// Collapse raw points into one value per day using the metric's aggregation.
function rollup(
  rows: { recorded_at: string; value: number }[],
  aggregation: Aggregation
): DailyPoint[] {
  const buckets = new Map<string, number[]>()
  for (const r of rows) {
    const k = dayKey(r.recorded_at)
    const arr = buckets.get(k) ?? []
    arr.push(Number(r.value))
    buckets.set(k, arr)
  }
  const out: DailyPoint[] = []
  Array.from(buckets.entries()).forEach(([date, vals]) => {
    let value: number
    if (aggregation === 'sum') value = vals.reduce((a: number, b: number) => a + b, 0)
    else if (aggregation === 'avg') value = vals.reduce((a: number, b: number) => a + b, 0) / vals.length
    else value = vals[vals.length - 1] // 'last'
    out.push({ date, value: Math.round(value * 100) / 100 })
  })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// Fetch + daily-aggregate a single metric over the range.
export async function fetchDailySeries(
  supabase: SupabaseClient,
  metricType: string,
  range: DateRange
): Promise<DailyPoint[]> {
  const def = getMetricDef(metricType)
  let query = supabase
    .from('health_metrics')
    .select('recorded_at, value')
    .eq('metric_type', metricType)
    .order('recorded_at', { ascending: true })

  const days = rangeToDays(range)
  if (days !== null) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    query = query.gte('recorded_at', since.toISOString())
  }

  const { data, error } = await query
  if (error || !data) return []
  return rollup(data as { recorded_at: string; value: number }[], def.aggregation)
}

// 7-day trailing rolling average over a daily series.
export function rollingAverage(series: DailyPoint[], window = 7): DailyPoint[] {
  return series.map((point, i) => {
    const slice = series.slice(Math.max(0, i - window + 1), i + 1)
    const avg = slice.reduce((a, b) => a + b.value, 0) / slice.length
    return { date: point.date, value: Math.round(avg * 100) / 100 }
  })
}
