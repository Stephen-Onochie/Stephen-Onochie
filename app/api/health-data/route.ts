import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchDailySeries, rollingAverage } from '@/lib/health/aggregate'
import { getMetricDef } from '@/lib/health/metrics'
import type { DateRange } from '@/types/health'

export const dynamic = 'force-dynamic'

const RANGES: DateRange[] = ['7d', '30d', '90d', 'all']

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user.email !== allowedEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const rangeParam = searchParams.get('range') as DateRange | null
  const range: DateRange = rangeParam && RANGES.includes(rangeParam) ? rangeParam : '30d'
  const metric = searchParams.get('metric')

  // List mode — distinct metric_types present in the user's data, with defs,
  // so the search bar only offers metrics that actually have rows. Uses the RPC
  // (distinct in the DB) so it isn't truncated by the 1000-row response cap.
  if (searchParams.get('list') === '1') {
    const { data } = await supabase.rpc('distinct_health_metric_types')
    const types = (data ?? []).map((r: { metric_type: string }) => r.metric_type)
    return NextResponse.json({ metrics: types.map((t: string) => getMetricDef(t)) })
  }

  // Single-metric mode (search bar / generic chart).
  if (metric) {
    const series = await fetchDailySeries(supabase, metric, range)
    const def = getMetricDef(metric)
    return NextResponse.json({ metric, def, series })
  }

  // Featured mode — the 5 hero charts plus the HRV rolling average.
  const [steps, restingHr, hrv, sleep, active] = await Promise.all([
    fetchDailySeries(supabase, 'steps', range),
    fetchDailySeries(supabase, 'resting_heart_rate', range),
    fetchDailySeries(supabase, 'hrv', range),
    fetchDailySeries(supabase, 'sleep_duration', range),
    fetchDailySeries(supabase, 'active_calories', range),
  ])

  return NextResponse.json({
    steps,
    restingHr,
    hrv,
    hrvAvg: rollingAverage(hrv, 7),
    sleep,
    active,
  })
}
