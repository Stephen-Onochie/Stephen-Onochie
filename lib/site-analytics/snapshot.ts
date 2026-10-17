import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysToDateStr, easternMidnight, todayEastern } from '@/lib/dates'
import { fetchBreakdown, fetchTrafficTotals, VercelAnalyticsError } from './vercel'

// How far back Vercel still answers queries; missing days inside this window
// are backfilled on every run, so a failed night heals itself.
const BACKFILL_DAYS = 29
// Late-arriving events can still land on the last couple of days.
const ALWAYS_REFRESH_DAYS = 2
const CONCURRENCY = 3

async function snapshotDay(admin: SupabaseClient, day: string) {
  const window = { start: easternMidnight(day), end: easternMidnight(addDaysToDateStr(day, 1)) }
  const [totals, topPages, referrers, countries, devices] = await Promise.all([
    fetchTrafficTotals(window),
    fetchBreakdown(window, 'requestPath', 10),
    fetchBreakdown(window, 'referrerHostname', 10),
    fetchBreakdown(window, 'country', 10),
    fetchBreakdown(window, 'deviceType', 10),
  ])
  const { error } = await admin.from('site_traffic_daily').upsert({
    day,
    page_views: totals.views,
    visitors: totals.visitors,
    top_pages: topPages,
    top_referrers: referrers,
    countries,
    devices,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export interface SnapshotResult {
  saved: string[]
  failed: { day: string; error: string }[]
  rateLimited: boolean
}

export async function runTrafficSnapshots(admin: SupabaseClient): Promise<SnapshotResult> {
  const yesterday = addDaysToDateStr(todayEastern(), -1)
  const oldest = addDaysToDateStr(yesterday, -(BACKFILL_DAYS - 1))

  const { data: existing } = await admin.from('site_traffic_daily').select('day').gte('day', oldest)
  const have = new Set((existing ?? []).map(row => row.day as string))

  const days: string[] = []
  for (let offset = 0; offset < BACKFILL_DAYS; offset++) {
    const day = addDaysToDateStr(yesterday, -offset)
    if (offset < ALWAYS_REFRESH_DAYS || !have.has(day)) days.push(day)
  }

  const result: SnapshotResult = { saved: [], failed: [], rateLimited: false }
  for (let i = 0; i < days.length && !result.rateLimited; i += CONCURRENCY) {
    const batch = days.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map(day =>
        snapshotDay(admin, day).then(
          () => result.saved.push(day),
          (error: unknown) => {
            if (error instanceof VercelAnalyticsError && error.status === 429) result.rateLimited = true
            result.failed.push({ day, error: error instanceof Error ? error.message : String(error) })
          }
        )
      )
    )
  }
  return result
}
