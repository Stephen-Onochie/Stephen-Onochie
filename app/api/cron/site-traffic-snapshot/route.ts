import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runTrafficSnapshots } from '@/lib/site-analytics/snapshot'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Nightly copy of Vercel Web Analytics into site_traffic_daily so traffic
// history outlives Vercel's ~30-day query window. Triggered by Vercel Cron
// (Authorization: Bearer <CRON_SECRET>).
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const result = await runTrafficSnapshots(createAdminClient())
  return NextResponse.json(result, { status: result.failed.length && !result.saved.length ? 502 : 200 })
}
