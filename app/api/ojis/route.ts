import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// The Ojis @ 50 control surface for /apps/ojis.
//
// /apps is already gated by middleware to the signed-in ALLOWED_EMAIL, so the
// page itself carries no admin key. This route re-checks the session on the
// server (middleware alone is not an authorization boundary for an API route)
// and then talks to the database with the service role. The ojis_sr_* functions
// are revoked from anon, so none of this is reachable from a browser directly.

async function requireOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user.email !== allowedEmail) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
  }
  return { error: null }
}

export async function GET() {
  const { error } = await requireOwner()
  if (error) return error

  const db = createAdminClient()

  const { data: status, error: sErr } = await db.rpc('ojis_sr_status')
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const [dash, guards] = await Promise.all([
    db.rpc('ojis_dashboard', { p_event_code: (status as { event_code: string }).event_code }),
    db.rpc('ojis_sr_guards_list'),
  ])

  return NextResponse.json({
    status,
    tables: dash.data?.tables ?? [],
    recent: dash.data?.recent ?? [],
    guards: guards.data?.guards ?? [],
  })
}

type Body =
  | { action: 'guard_upsert'; id: number | null; name: string; post: string; password: string; active: boolean }
  | { action: 'guard_delete'; id: number }
  | { action: 'set_password'; password: string }
  | { action: 'set_event_code'; code: string }

export async function POST(request: Request) {
  const { error } = await requireOwner()
  if (error) return error

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const db = createAdminClient()
  let rpc: { data: unknown; error: { message: string } | null }

  switch (body.action) {
    case 'guard_upsert':
      rpc = await db.rpc('ojis_sr_guard_upsert', {
        p_id: body.id,
        p_name: body.name,
        p_post: body.post,
        p_password: body.password,
        p_active: body.active,
      })
      break
    case 'guard_delete':
      rpc = await db.rpc('ojis_sr_guard_delete', { p_id: body.id })
      break
    case 'set_password':
      rpc = await db.rpc('ojis_sr_set_password', { p_new_password: body.password })
      break
    case 'set_event_code':
      rpc = await db.rpc('ojis_sr_set_event_code', { p_new_code: body.code })
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 500 })
  return NextResponse.json(rpc.data)
}
