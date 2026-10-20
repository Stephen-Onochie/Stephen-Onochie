import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { linkedinSearchUrl, MAX_AREA_LINKEDIN_SEARCHES } from '@/lib/internship/sources'

export const dynamic = 'force-dynamic'

// Returns what the ingestion routine should poll beyond the hardcoded feeds:
// active ATS targets (company + platform + slug, tagged with their focus area)
// and LinkedIn searches built from active focus areas' search terms, plus the
// areas themselves so the routine knows which postings to keep. Same bearer
// auth as the ingest endpoint.
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
  const [targetsRes, areasRes] = await Promise.all([
    supabase
      .from('internship_targets')
      .select('company, ats_platform, ats_slug, focus_area_id')
      .eq('user_id', userId)
      .eq('active', true)
      .not('ats_platform', 'is', null)
      .not('ats_slug', 'is', null),
    supabase
      .from('internship_focus_areas')
      .select('id, name, description, search_terms, active')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
  ])

  if (targetsRes.error || areasRes.error) {
    return NextResponse.json({ error: (targetsRes.error ?? areasRes.error)!.message }, { status: 500 })
  }

  const areas = areasRes.data ?? []
  const areaName = new Map(areas.map(a => [a.id, a.name as string]))
  const activeAreas = areas.filter(a => a.active)
  const activeIds = new Set(activeAreas.map(a => a.id))

  // A paused area pauses its companies too.
  const targets = (targetsRes.data ?? [])
    .filter(t => !t.focus_area_id || activeIds.has(t.focus_area_id))
    .map(t => ({
      company: t.company,
      ats_platform: t.ats_platform,
      ats_slug: t.ats_slug,
      focus_area: t.focus_area_id ? areaName.get(t.focus_area_id) ?? null : null,
    }))

  // Round-robin across areas so one area with many terms can't starve the rest.
  const queues = activeAreas.map(a => ((a.search_terms as string[]) ?? []).map(term => ({
    url: linkedinSearchUrl(term),
    focus_area: a.name as string,
  })))
  const linkedin_searches: { url: string; focus_area: string }[] = []
  for (let i = 0; linkedin_searches.length < MAX_AREA_LINKEDIN_SEARCHES && queues.some(q => q.length > i); i++) {
    for (const q of queues) {
      if (q[i] && linkedin_searches.length < MAX_AREA_LINKEDIN_SEARCHES) linkedin_searches.push(q[i])
    }
  }

  return NextResponse.json({
    targets,
    linkedin_searches,
    focus_areas: activeAreas.map(a => ({ name: a.name, description: a.description })),
  })
}
