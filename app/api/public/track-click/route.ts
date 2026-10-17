import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidClickTarget } from '@/lib/site-analytics/click-targets'
import { isPrivatePath } from '@/lib/site-analytics/visitor'

const BOT_USER_AGENT = /bot|crawl|spider|slurp|headless|lighthouse|preview/i

// Public, unauthenticated: the portfolio's ClickTracker beacons here. Only
// known targets on public paths are stored; everything else is dropped silently
// so a scripted caller learns nothing.
export async function POST(request: Request) {
  const userAgent = request.headers.get('user-agent') ?? ''
  if (BOT_USER_AGENT.test(userAgent)) return new NextResponse(null, { status: 204 })

  const payload = await request.json().catch(() => null)
  const target = typeof payload?.target === 'string' ? payload.target : ''
  const path = typeof payload?.path === 'string' ? payload.path.slice(0, 200) : ''
  if (!isValidClickTarget(target) || !path.startsWith('/') || isPrivatePath(path)) {
    return new NextResponse(null, { status: 204 })
  }

  await createAdminClient()
    .from('site_click_events')
    .insert({ target, path, country: request.headers.get('x-vercel-ip-country') })

  return new NextResponse(null, { status: 204 })
}
