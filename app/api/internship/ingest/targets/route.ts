import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Returns the active ATS targets (company + platform + slug) the ingestion
// routine should poll. Same bearer auth as the ingest endpoint.
export async function GET(req: Request) {
  const secret = process.env.INGEST_SECRET
  const userId = process.env.INTERNSHIP_USER_ID

  if (!secret || !userId) {
    return NextResponse.json({ error: 'Ingest not configured' }, { status: 500 })
  }

  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('internship_targets')
    .select('company, ats_platform, ats_slug')
    .eq('user_id', userId)
    .eq('active', true)
    .not('ats_platform', 'is', null)
    .not('ats_slug', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ targets: data ?? [] })
}
