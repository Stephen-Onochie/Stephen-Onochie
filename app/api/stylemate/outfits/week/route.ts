import { NextResponse } from 'next/server'
import { errorMessage, requireOwner } from '@/lib/stylemate/server'
import { planWeek } from '@/lib/stylemate/week'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Manual "plan my week" trigger; the Sunday cron runs the same planner.
export async function POST() {
  const auth = await requireOwner()
  if (!auth.ok) return auth.response
  try {
    const result = await planWeek(auth.supabase, auth.user.id)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Week planning failed') }, { status: 502 })
  }
}
