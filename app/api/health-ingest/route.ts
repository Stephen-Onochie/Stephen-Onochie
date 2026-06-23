import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseHealthExport } from '@/lib/health/parse'

export const dynamic = 'force-dynamic'

// Ingest endpoint for Health Auto Export. The iPhone app POSTs here on a
// schedule with no browser session, so it authenticates with a shared bearer
// secret and we write via the service-role client (bypassing RLS), stamping
// every row with HEALTH_USER_ID.
export async function POST(req: Request) {
  const secret = process.env.HEALTH_INGEST_SECRET
  const userId = process.env.HEALTH_USER_ID
  const auth = req.headers.get('authorization')

  if (!secret || !userId) {
    return NextResponse.json({ error: 'Ingest not configured' }, { status: 500 })
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const points = parseHealthExport(payload as never)

  // Dedupe within the batch — the unique (user_id, metric_type, recorded_at)
  // constraint rejects an upsert that contains the same key twice. Last wins.
  const byKey = new Map<string, (typeof points)[number]>()
  for (const p of points) byKey.set(`${p.metric_type}|${p.recorded_at}`, p)
  const rows = Array.from(byKey.values()).map(p => ({
    user_id: userId,
    metric_type: p.metric_type,
    recorded_at: p.recorded_at,
    value: p.value,
    unit: p.unit,
    source_app: 'health_auto_export',
  }))

  let status = 'ok'
  let error: string | null = null

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from('health_metrics')
      .upsert(rows, { onConflict: 'user_id,metric_type,recorded_at' })
    if (upsertError) {
      status = 'error'
      error = upsertError.message
    }
  }

  await supabase.from('health_ingest_log').insert({
    user_id: userId,
    source: 'health_auto_export',
    record_count: rows.length,
    status,
    error,
  })

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
  return NextResponse.json({ success: true, count: rows.length })
}
