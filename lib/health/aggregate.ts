import type { SupabaseClient } from '@supabase/supabase-js'
import type { DailyPoint, DateRange } from '@/types/health'
import { getMetricDef } from './metrics'

export function rangeToDays(range: DateRange): number | null {
  if (range === '7d') return 7
  if (range === '30d') return 30
  if (range === '90d') return 90
  return null // 'all'
}

// Fetch a metric already daily-aggregated in the DB. Aggregating server-side
// avoids pulling raw rows (which the 1000-row PostgREST cap would truncate over
// long ranges) and is fast over years of data.
export async function fetchDailySeries(
  supabase: SupabaseClient,
  metricType: string,
  range: DateRange
): Promise<DailyPoint[]> {
  const def = getMetricDef(metricType)
  const { data, error } = await supabase.rpc('daily_health_series', {
    p_metric_type: metricType,
    p_agg: def.aggregation,
    p_since_days: rangeToDays(range),
  })
  if (error || !data) return []
  return (data as { day: string; value: number }[]).map(r => ({
    date: r.day,
    value: Number(r.value),
  }))
}

// 7-day trailing rolling average over a daily series.
export function rollingAverage(series: DailyPoint[], window = 7): DailyPoint[] {
  return series.map((point, i) => {
    const slice = series.slice(Math.max(0, i - window + 1), i + 1)
    const avg = slice.reduce((a, b) => a + b.value, 0) / slice.length
    return { date: point.date, value: Math.round(avg * 100) / 100 }
  })
}
