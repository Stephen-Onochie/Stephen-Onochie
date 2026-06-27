import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
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

// On-demand test send of the weekly digest. Session-gated (the signed-in user
// triggers it from Settings) and sends only to their own digest_email — unlike
// the cron route, it ignores the email_nudges_enabled toggle so it can be used
// to verify delivery before turning nudges on.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: settings, error: settingsErr } = await supabase
    .from('internship_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (settingsErr) {
    return NextResponse.json({ error: settingsErr.message }, { status: 500 })
  }

  const to = (settings as InternshipSettings | null)?.digest_email
  if (!to) {
    return NextResponse.json(
      { error: 'No digest email set. Save one first.' },
      { status: 400 }
    )
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured on the server' }, { status: 500 })
  }
  const from = process.env.INTERNSHIP_DIGEST_FROM ?? 'Internship Tracker <onboarding@resend.dev>'

  const [apps, contacts, interviews, tasks, goals] = await Promise.all([
    supabase.from('internship_applications').select('*').eq('user_id', user.id),
    supabase.from('internship_contacts').select('*').eq('user_id', user.id),
    supabase.from('internship_interviews').select('*').eq('user_id', user.id),
    supabase.from('internship_tasks').select('*').eq('user_id', user.id),
    supabase.from('internship_weekly_goals').select('*').eq('user_id', user.id),
  ])

  const digest = buildDigest({
    applications: (apps.data as Application[]) ?? [],
    contacts: (contacts.data as Contact[]) ?? [],
    interviews: (interviews.data as Interview[]) ?? [],
    tasks: (tasks.data as Task[]) ?? [],
    weeklyGoals: (goals.data as WeeklyGoal[]) ?? [],
  })

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `[Test] ${digest.subject}`,
    html: digest.html,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 })
  }

  return NextResponse.json({ sent: true, to })
}
