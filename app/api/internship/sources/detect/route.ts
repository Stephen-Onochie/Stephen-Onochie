import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseAtsUrl } from '@/lib/internship/sources'
import type { AtsPlatform } from '@/types/internship'

// Finds a company's public Greenhouse / Lever / Ashby board so the ingestion
// routine can scan it. Takes a pasted board/careers URL, or guesses slugs from
// the company name and probes each platform's public API.

export const dynamic = 'force-dynamic'

const INTERN_HINT = /\b(intern|internship|co[\s-]?op)\b/i

const BOARD_API: Record<AtsPlatform, (slug: string) => string> = {
  greenhouse: slug => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
  lever: slug => `https://api.lever.co/v0/postings/${slug}?mode=json`,
  ashby: slug => `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
}

async function probe(platform: AtsPlatform, slug: string) {
  try {
    const res = await fetch(BOARD_API[platform](encodeURIComponent(slug)), {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const jobs: Record<string, unknown>[] = Array.isArray(data) ? data : data.jobs ?? []
    // An empty Lever/Ashby board for a made-up slug still 200s; a real board
    // with zero openings is indistinguishable, so require at least one job.
    if (jobs.length === 0) return null
    const internships = jobs.filter(j => INTERN_HINT.test(String(j.title ?? j.text ?? ''))).length
    return { platform, slug, jobs: jobs.length, internships }
  } catch {
    return null
  }
}

function slugCandidates(company: string): string[] {
  const base = company
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\b(inc|llc|corp|corporation|co|ltd|technologies|technology)\b\.?/g, '')
    .trim()
  const words = base.split(/[^a-z0-9]+/).filter(Boolean)
  if (words.length === 0) return []
  return Array.from(new Set([words.join(''), words.join('-'), words[0]]))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user.email !== allowedEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: { company?: string; url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const fromUrl = body.url ? parseAtsUrl(body.url) : null
  if (fromUrl) {
    const hit = await probe(fromUrl.platform, fromUrl.slug)
    return NextResponse.json({ board: hit ?? { ...fromUrl, jobs: 0, internships: 0 } })
  }

  const company = body.company?.trim()
  if (!company) return NextResponse.json({ board: null })

  const attempts = slugCandidates(company).flatMap(slug =>
    (Object.keys(BOARD_API) as AtsPlatform[]).map(platform => probe(platform, slug))
  )
  const hits = (await Promise.all(attempts)).filter(h => h !== null)
  hits.sort((a, b) => b.jobs - a.jobs)
  return NextResponse.json({ board: hits[0] ?? null })
}
