import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysToDateStr, easternDateStr, easternMidnight, todayEastern } from '@/lib/dates'
import { clickTargetLabel } from './click-targets'
import {
  fetchBreakdown,
  fetchTrafficTotals,
  type BreakdownDimension,
  type TrafficRow,
  type TrafficWindow,
} from './vercel'

export const ANALYTICS_RANGES = ['24h', '7d', '30d', '90d', 'all'] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

// Vercel only answers queries for roughly the last 30 days, so longer ranges
// read the nightly site_traffic_daily snapshots instead.
const LIVE_RANGES: AnalyticsRange[] = ['24h', '7d', '30d']
const RANGE_DAYS: Record<AnalyticsRange, number | null> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, all: null }

const BREAKDOWNS: Record<'topPages' | 'referrers' | 'countries' | 'devices', BreakdownDimension> = {
  topPages: 'requestPath',
  referrers: 'referrerHostname',
  countries: 'country',
  devices: 'deviceType',
}

export interface TrendPoint {
  // ISO instant for hourly points, YYYY-MM-DD (Eastern) for daily points.
  label: string
  views: number
}

export interface ClickRow {
  target: string
  label: string
  clicks: number
}

interface TrafficSection {
  views: number
  visitors: number
  trend: TrendPoint[]
  topPages: TrafficRow[]
  referrers: TrafficRow[]
  countries: TrafficRow[]
  devices: TrafficRow[]
}

export interface SiteAnalyticsReport extends TrafficSection {
  range: AnalyticsRange
  source: 'live' | 'snapshot'
  trendUnit: 'hour' | 'day'
  // Snapshot ranges add up each day's unique visitors, so a repeat visitor
  // counts once per day they came back.
  visitorsAreDailySums: boolean
  clicks: ClickRow[]
  totalClicks: number
  trafficError: string | null
}

const EMPTY_TRAFFIC: TrafficSection = {
  views: 0,
  visitors: 0,
  trend: [],
  topPages: [],
  referrers: [],
  countries: [],
  devices: [],
}

function rangeWindow(range: AnalyticsRange, now = new Date()): TrafficWindow {
  if (range === '24h') return { start: new Date(now.getTime() - 24 * 3600 * 1000), end: now }
  const days = RANGE_DAYS[range] ?? 3650
  return { start: easternMidnight(addDaysToDateStr(todayEastern(), -(days - 1))), end: now }
}

function dayLabels(firstDay: string, lastDay: string): string[] {
  const labels: string[] = []
  for (let day = firstDay; day <= lastDay; day = addDaysToDateStr(day, 1)) labels.push(day)
  return labels
}

async function fetchLiveTraffic(range: AnalyticsRange): Promise<TrafficSection> {
  const window = rangeWindow(range)
  const [totals, topPages, referrers, countries, devices] = await Promise.all([
    fetchTrafficTotals(window),
    fetchBreakdown(window, BREAKDOWNS.topPages),
    fetchBreakdown(window, BREAKDOWNS.referrers),
    fetchBreakdown(window, BREAKDOWNS.countries),
    fetchBreakdown(window, BREAKDOWNS.devices),
  ])

  let trend: TrendPoint[]
  if (range === '24h') {
    trend = totals.hourly.map(point => ({ label: point.timestamp, views: point.views }))
  } else {
    const viewsByDay = new Map<string, number>()
    for (const point of totals.hourly) {
      const day = easternDateStr(new Date(point.timestamp))
      viewsByDay.set(day, (viewsByDay.get(day) ?? 0) + point.views)
    }
    trend = dayLabels(easternDateStr(window.start), todayEastern()).map(day => ({
      label: day,
      views: viewsByDay.get(day) ?? 0,
    }))
  }

  return { views: totals.views, visitors: totals.visitors, trend, topPages, referrers, countries, devices }
}

// Thrown errors are not cached, so a fixed token takes effect immediately.
const cachedLiveTraffic = unstable_cache(fetchLiveTraffic, ['site-analytics-live'], { revalidate: 600 })

interface SnapshotRow {
  day: string
  page_views: number
  visitors: number
  top_pages: TrafficRow[]
  top_referrers: TrafficRow[]
  countries: TrafficRow[]
  devices: TrafficRow[]
}

function mergeRows(lists: TrafficRow[][], limit = 8): TrafficRow[] {
  const merged = new Map<string, TrafficRow>()
  for (const row of lists.flat()) {
    const existing = merged.get(row.key) ?? { key: row.key, views: 0, visitors: 0 }
    existing.views += row.views
    existing.visitors += row.visitors
    merged.set(row.key, existing)
  }
  return Array.from(merged.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

async function fetchSnapshotTraffic(admin: SupabaseClient, range: AnalyticsRange): Promise<TrafficSection> {
  const days = RANGE_DAYS[range]
  let query = admin.from('site_traffic_daily').select('*').order('day')
  if (days) query = query.gte('day', addDaysToDateStr(todayEastern(), -(days - 1)))
  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as SnapshotRow[]
  if (rows.length === 0) return EMPTY_TRAFFIC

  const viewsByDay = new Map(rows.map(row => [row.day, row.page_views]))
  const firstDay = days ? addDaysToDateStr(todayEastern(), -(days - 1)) : rows[0].day
  const lastDay = addDaysToDateStr(todayEastern(), -1)

  return {
    views: rows.reduce((sum, row) => sum + row.page_views, 0),
    visitors: rows.reduce((sum, row) => sum + row.visitors, 0),
    trend: dayLabels(firstDay, lastDay).map(day => ({ label: day, views: viewsByDay.get(day) ?? 0 })),
    topPages: mergeRows(rows.map(row => row.top_pages)),
    referrers: mergeRows(rows.map(row => row.top_referrers)),
    countries: mergeRows(rows.map(row => row.countries)),
    devices: mergeRows(rows.map(row => row.devices)),
  }
}

async function fetchClicks(admin: SupabaseClient, range: AnalyticsRange): Promise<ClickRow[]> {
  const since = RANGE_DAYS[range] ? rangeWindow(range).start : new Date(0)
  const { data, error } = await admin.rpc('site_click_counts', { since: since.toISOString() })
  if (error) throw error
  return ((data ?? []) as { target: string; clicks: number }[]).map(row => ({
    target: row.target,
    label: clickTargetLabel(row.target),
    clicks: Number(row.clicks),
  }))
}

export async function buildSiteAnalyticsReport(
  admin: SupabaseClient,
  range: AnalyticsRange
): Promise<SiteAnalyticsReport> {
  const live = LIVE_RANGES.includes(range)
  const [trafficResult, clicks] = await Promise.all([
    (live ? cachedLiveTraffic(range) : fetchSnapshotTraffic(admin, range)).then(
      traffic => ({ traffic, error: null }),
      (error: unknown) => ({
        traffic: EMPTY_TRAFFIC,
        error: error instanceof Error ? error.message : 'Could not load traffic data',
      })
    ),
    fetchClicks(admin, range),
  ])

  return {
    range,
    source: live ? 'live' : 'snapshot',
    trendUnit: range === '24h' ? 'hour' : 'day',
    visitorsAreDailySums: !live,
    ...trafficResult.traffic,
    clicks,
    totalClicks: clicks.reduce((sum, row) => sum + row.clicks, 0),
    trafficError: trafficResult.error,
  }
}
