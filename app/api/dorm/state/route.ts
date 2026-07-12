import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { supabase, user }
}

export async function GET() {
  const ctx = await requireUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await ctx.supabase.from('dorm_state').select('state').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ state: data?.state ?? null })
}

export async function PUT(request: Request) {
  const ctx = await requireUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { state?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.state || typeof body.state !== 'object') {
    return NextResponse.json({ error: 'state is required' }, { status: 400 })
  }
  const { error } = await ctx.supabase.from('dorm_state').upsert(
    { user_id: ctx.user.id, state: body.state, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: true })
}
