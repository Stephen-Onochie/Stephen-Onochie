import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Best-effort metadata scrape for quick-add. Fetches the job URL server-side
// (avoids CORS) and pulls company/role/location from OpenGraph + JSON-LD +
// <title>. Always degrades to manual entry — never blocks the add.

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function meta(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return decode(m[1])
  }
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const url = body.url?.trim()
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'A valid http(s) URL is required' }, { status: 400 })
  }

  let company: string | null = null
  let role_title: string | null = null
  let location: string | null = null

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; InternshipTracker/1.0; +https://stephenonochie.com)',
      },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()

    // JSON-LD JobPosting is the richest source when present.
    const ldMatches = Array.from(
      html.matchAll(
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
      )
    )
    for (const m of ldMatches) {
      try {
        const json = JSON.parse(m[1])
        const nodes = Array.isArray(json) ? json : [json]
        for (const node of nodes) {
          const type = node['@type']
          const isJob = type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))
          if (isJob) {
            role_title = role_title ?? (node.title ? decode(String(node.title)) : null)
            const org = node.hiringOrganization
            if (org) company = company ?? decode(String(org.name ?? org))
            const loc = node.jobLocation
            if (loc) {
              const addr = Array.isArray(loc) ? loc[0]?.address : loc.address
              if (addr) {
                const city = addr.addressLocality
                const region = addr.addressRegion
                location = location ?? decode([city, region].filter(Boolean).join(', '))
              }
            }
          }
        }
      } catch {
        // skip malformed ld+json block
      }
    }

    company = company ?? meta(html, 'og:site_name')
    role_title = role_title ?? meta(html, 'og:title')
    if (!role_title) {
      const t = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (t) role_title = decode(t[1])
    }
  } catch {
    // Scrape failed (timeout, blocked, etc.) — fall through to manual entry.
  }

  return NextResponse.json({ company, role_title, location, job_url: url })
}
