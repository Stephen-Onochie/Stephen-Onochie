import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildDigest } from '@/lib/internship/digest'
import type {
  Application,
  Contact,
  Interview,
  Task,
  WeeklyGoal,
  InternshipSettings,
} from '@/types/internship'

export const dynamic = 'force-dynamic'

// Weekly Sunday digest. Triggered by Vercel Cron (see vercel.json). Vercel
// stamps cron requests with an Authorization: Bearer <CRON_SECRET> header.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()

  // Single-user app: read every internship_settings row with nudges on.
  const { data: settingsRows, error: settingsErr } = await supabase
    .from('internship_settings')
    .select('*')
    .eq('email_nudges_enabled', true)
  if (settingsErr) {
    return NextResponse.json({ error: settingsErr.message }, { status: 500 })
  }

  const enabled = (settingsRows as InternshipSettings[]) ?? []
  if (enabled.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no users with nudges enabled' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  const resend = new Resend(apiKey)
  const from = process.env.INTERNSHIP_DIGEST_FROM ?? 'Internship Tracker <onboarding@resend.dev>'

  let sent = 0
  for (const s of enabled) {
    const to = s.digest_email
    if (!to) continue

    const [apps, contacts, interviews, tasks, goals] = await Promise.all([
      supabase.from('internship_applications').select('*').eq('user_id', s.user_id),
      supabase.from('internship_contacts').select('*').eq('user_id', s.user_id),
      supabase.from('internship_interviews').select('*').eq('user_id', s.user_id),
      supabase.from('internship_tasks').select('*').eq('user_id', s.user_id),
      supabase.from('internship_weekly_goals').select('*').eq('user_id', s.user_id),
    ])

    const digest = buildDigest({
      applications: (apps.data as Application[]) ?? [],
      contacts: (contacts.data as Contact[]) ?? [],
      interviews: (interviews.data as Interview[]) ?? [],
      tasks: (tasks.data as Task[]) ?? [],
      weeklyGoals: (goals.data as WeeklyGoal[]) ?? [],
    })

    await resend.emails.send({
      from,
      to,
      subject: digest.subject,
      html: digest.html,
    })
    sent++
  }

  return NextResponse.json({ sent })
}
