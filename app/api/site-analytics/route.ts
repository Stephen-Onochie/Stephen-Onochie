import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ANALYTICS_RANGES, buildSiteAnalyticsReport, type AnalyticsRange } from '@/lib/site-analytics/report'

export const dynamic = 'force-dynamic'

// Owner-only. Click events and traffic snapshots have RLS with no policies, so
// they're read with the service-role client after the session check below.
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user.email !== allowedEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const rangeParam = new URL(request.url).searchParams.get('range') as AnalyticsRange | null
  const range: AnalyticsRange = rangeParam && ANALYTICS_RANGES.includes(rangeParam) ? rangeParam : '7d'

  const report = await buildSiteAnalyticsReport(createAdminClient(), range)
  return NextResponse.json(report)
}
