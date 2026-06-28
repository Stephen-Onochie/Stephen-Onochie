import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dedupeKey, computePriority } from '@/lib/internship/ingest'
import { daysUntil } from '@/lib/internship/dates'
import type {
  IngestRequest,
  IngestResponse,
  IngestCandidate,
  CityTag,
  Lane,
  RoleType,
} from '@/types/internship'

export const dynamic = 'force-dynamic'

const INSERT_CAP = 50

// Ingestion endpoint for the scheduled Claude routine. Authenticates with a
// shared bearer secret and writes via the service-role client (bypassing RLS),
// stamping every row with INTERNSHIP_USER_ID. Dedupe state lives entirely here
// so the stateless routine never needs memory.
export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET
  const userId = process.env.INTERNSHIP_USER_ID
  const activeSeason = process.env.INGEST_ACTIVE_SEASON ?? 'summer_2027'

  if (!secret || !userId) {
    return NextResponse.json({ error: 'Ingest not configured' }, { status: 500 })
  }

  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: IngestRequest
  try {
    body = (await req.json()) as IngestRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const candidates = Array.isArray(body.candidates) ? body.candidates : []
  const supabase = createAdminClient()

  // 1) Season guard — drop anything not for the active cycle.
  let skippedSeason = 0
  const inSeason = candidates.filter(c => {
    if ((c.season ?? activeSeason) === activeSeason) return true
    skippedSeason++
    return false
  })

  // 2) Dedupe — against existing rows AND within the batch.
  const { data: existingRows, error: fetchErr } = await supabase
    .from('internship_applications')
    .select('job_url, company, role_title, location')
    .eq('user_id', userId)
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const seen = new Set<string>(
    (existingRows ?? []).map(r =>
      dedupeKey({
        job_url: r.job_url,
        company: r.company,
        role_title: r.role_title,
        location: r.location,
      })
    )
  )

  let skippedDuplicates = 0
  const fresh: IngestCandidate[] = []
  for (const c of inSeason) {
    if (!c.company || !c.role_title) {
      skippedDuplicates++ // malformed candidate; count as skipped rather than insert junk
      continue
    }
    const key = dedupeKey(c)
    if (seen.has(key)) {
      skippedDuplicates++
      continue
    }
    seen.add(key)
    fresh.push(c)
  }

  // 3) Cap at 50, freshest posting first.
  fresh.sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''))
  const capped = fresh.length > INSERT_CAP
  const toInsert = fresh.slice(0, INSERT_CAP)

  // 4) Build rows — compute priority server-side, ignore any sent.
  const rows = toInsert.map(c => {
    const city_tag: CityTag = c.city_tag ?? 'other'
    const lane: Lane = c.lane ?? 'lane2_portal'
    const role_type: RoleType = c.role_type ?? 'swe'
    return {
      user_id: userId,
      company: c.company,
      role_title: c.role_title,
      job_url: c.job_url ?? null,
      location: c.location ?? null,
      city_tag,
      lane,
      role_type,
      stage: 'wishlist' as const,
      priority: computePriority(lane, city_tag),
      is_paid_confirmed: c.is_paid_confirmed ?? false,
      work_auth_flag: c.work_auth_flag ?? false,
      deadline: c.deadline ?? null,
      season: c.season ?? activeSeason,
      source: c.source ?? null,
      created_via: 'ingestion' as const,
    }
  })

  let inserted = 0
  if (rows.length > 0) {
    const { error: insertErr } = await supabase
      .from('internship_applications')
      .insert(rows)
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }
    inserted = rows.length
  }

  // 5) Deadline alerts — Lane 1 programs with a deadline within 7 days.
  const { data: lane1Rows } = await supabase
    .from('internship_applications')
    .select('deadline')
    .eq('user_id', userId)
    .eq('lane', 'lane1_program')
    .not('deadline', 'is', null)
  const deadlineAlerts = (lane1Rows ?? []).filter(r => {
    const d = daysUntil(r.deadline as string)
    return d >= 0 && d <= 7
  }).length

  const response: IngestResponse = {
    inserted,
    skipped_duplicates: skippedDuplicates,
    skipped_season: skippedSeason,
    capped,
    deadline_alerts: deadlineAlerts,
  }
  return NextResponse.json(response)
}
