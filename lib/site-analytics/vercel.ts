// Server-only client for Vercel's Observability metrics API — the same
// endpoint `vercel metrics` calls. Requires a TEAM-scoped access token
// (VERCEL_ANALYTICS_TOKEN): project-scoped tokens are rejected with 403.
const METRICS_ENDPOINT = 'https://api.vercel.com/metrics/v1'
const VERCEL_TEAM_ID = 'team_oBpDRrn3fjkvESKN3bb7mqFq'
const VERCEL_PROJECT_ID = 'prj_nxXoloAyhY08tjWJE6hG7AVcdVHu'
const PAGE_VIEW_METRIC = 'vercel.analytics.page_view.count'

// Daily buckets make the API widen a range to whole UTC days, which breaks
// Eastern-day windows. Hourly buckets keep any hour-aligned range exact.
const BUCKET_SECONDS = 3600
const HOUR_MS = BUCKET_SECONDS * 1000

// Public portfolio only. Historic page views include the owner's private-app
// browsing (recorded before SiteAnalytics' beforeSend filter existed).
const PUBLIC_SITE_FILTER =
  '(not requestPath:/apps*) AND (not requestPath:/login*) AND (not requestPath:/auth*) AND (environment:production)'

export type BreakdownDimension = 'requestPath' | 'referrerHostname' | 'country' | 'deviceType'

export interface TrafficWindow {
  start: Date
  end: Date
}

export interface TrafficRow {
  key: string
  views: number
  visitors: number
}

export interface TrafficTotals {
  views: number
  visitors: number
  hourly: { timestamp: string; views: number }[]
}

interface MetricsPoint {
  timestamp?: string
  dimensions: Record<string, string | null>
  values: Record<string, number | null>
}

interface MetricsResponse {
  series?: MetricsPoint[]
  summary: MetricsPoint[]
}

export class VercelAnalyticsError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

const VIEWS_AND_VISITORS = {
  views: { metric: PAGE_VIEW_METRIC, aggregation: 'count' },
  visitors: { metric: PAGE_VIEW_METRIC, aggregation: 'unique', dimensions: ['visitorId'] },
}

function hourAligned({ start, end }: TrafficWindow) {
  return {
    start: new Date(Math.floor(start.getTime() / HOUR_MS) * HOUR_MS).toISOString(),
    end: new Date(Math.ceil(end.getTime() / HOUR_MS) * HOUR_MS).toISOString(),
  }
}

async function queryPageViews(
  window: TrafficWindow,
  grouping?: { dimension: BreakdownDimension; limit: number }
): Promise<MetricsResponse> {
  const token = process.env.VERCEL_ANALYTICS_TOKEN
  if (!token) throw new VercelAnalyticsError(500, 'VERCEL_ANALYTICS_TOKEN is not set')

  const body = {
    scope: { ownerId: VERCEL_TEAM_ID, projectIds: [VERCEL_PROJECT_ID] },
    timeRange: hourAligned(window),
    bucketSeconds: BUCKET_SECONDS,
    filter: PUBLIC_SITE_FILTER,
    metrics: VIEWS_AND_VISITORS,
    outputs: ['views', 'visitors'],
    ...(grouping
      ? {
          groupBy: [grouping.dimension],
          seriesSelection: {
            limit: grouping.limit,
            mode: 'exact',
            rankBy: [{ metric: 'views', direction: 'desc' }],
          },
        }
      : {}),
  }

  const res = await fetch(`${METRICS_ENDPOINT}?teamId=${VERCEL_TEAM_ID}`, {
    method: 'POST',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    const message =
      res.status === 403
        ? 'Vercel rejected the token (403). VERCEL_ANALYTICS_TOKEN must be team-scoped (All Projects), not project-scoped.'
        : `Vercel metrics API ${res.status}: ${detail?.error?.message ?? res.statusText}`
    throw new VercelAnalyticsError(res.status, message)
  }
  return res.json()
}

export async function fetchTrafficTotals(window: TrafficWindow): Promise<TrafficTotals> {
  const response = await queryPageViews(window)
  const summary = response.summary[0]?.values
  return {
    views: summary?.views ?? 0,
    visitors: summary?.visitors ?? 0,
    hourly: (response.series ?? []).map(point => ({
      timestamp: point.timestamp ?? '',
      views: point.values.views ?? 0,
    })),
  }
}

export async function fetchBreakdown(
  window: TrafficWindow,
  dimension: BreakdownDimension,
  limit = 8
): Promise<TrafficRow[]> {
  const response = await queryPageViews(window, { dimension, limit })
  return response.summary.map(point => ({
    key: point.dimensions[dimension] ?? '',
    views: point.values.views ?? 0,
    visitors: point.values.visitors ?? 0,
  }))
}
