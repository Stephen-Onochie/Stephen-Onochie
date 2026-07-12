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
  const { data, error } = await ctx.supabase.from('dorm_layout').select('item_id, placement')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const layout: Record<string, unknown> = {}
  for (const row of data ?? []) layout[row.item_id] = row.placement
  return NextResponse.json({ layout })
}

export async function PUT(request: Request) {
  const ctx = await requireUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { layout?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const entries = Object.entries(body.layout ?? {})
  if (!entries.length) return NextResponse.json({ saved: 0 })
  if (entries.length > 200) return NextResponse.json({ error: 'Too many items' }, { status: 400 })
  const now = new Date().toISOString()
  const rows = entries.map(([item_id, placement]) => ({
    user_id: ctx.user.id,
    item_id,
    placement,
    updated_at: now,
  }))
  const { error } = await ctx.supabase
    .from('dorm_layout')
    .upsert(rows, { onConflict: 'user_id,item_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: rows.length })
}

export async function DELETE() {
  const ctx = await requireUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await ctx.supabase.from('dorm_layout').delete().eq('user_id', ctx.user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reset: true })
}
