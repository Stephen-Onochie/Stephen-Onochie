import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { SITE_TIMEZONE } from '@/lib/dates'
import { errorMessage, ownerUserId } from '@/lib/stylemate/server'
import { planWeek } from '@/lib/stylemate/week'
import { buildWeeklyEmail } from '@/lib/stylemate/weekly-email'
import type { WardrobeItem } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SEND_HOUR_EASTERN = 8

function easternHour(): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: SITE_TIMEZONE, hour: 'numeric', hour12: false }).format(new Date()))
}

// Sunday outfit plan. vercel.json fires this at both 12:00 and 13:00 UTC so one
// of them lands on 8am Eastern across daylight saving; the other exits early.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = new URL(request.url).searchParams.get('force') === '1'
  if (!force && easternHour() !== SEND_HOUR_EASTERN) {
    return NextResponse.json({ skipped: 'not 8am Eastern' })
  }

  const userId = ownerUserId()
  if (!userId) return NextResponse.json({ error: 'STYLEMATE_USER_ID not configured' }, { status: 500 })
  const supabase = createAdminClient()

  try {
    const { outfits } = await planWeek(supabase, userId)

    const { data: itemRows } = await supabase.from('wardrobe_items').select('*').eq('user_id', userId)
    const { data: owner } = await supabase.auth.admin.getUserById(userId)
    const to = owner.user?.email
    const apiKey = process.env.RESEND_API_KEY
    if (!to || !apiKey) return NextResponse.json({ planned: outfits.length, emailed: false })

    const email = buildWeeklyEmail(outfits, (itemRows as WardrobeItem[]) ?? [])
    await new Resend(apiKey).emails.send({
      from: process.env.STYLEMATE_EMAIL_FROM ?? process.env.INTERNSHIP_DIGEST_FROM ?? 'StyleMate <onboarding@resend.dev>',
      to,
      subject: email.subject,
      html: email.html,
    })
    return NextResponse.json({ planned: outfits.length, emailed: true })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Weekly plan failed') }, { status: 500 })
  }
}
