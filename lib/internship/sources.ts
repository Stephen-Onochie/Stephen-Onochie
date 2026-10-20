import type { AtsPlatform } from '@/types/internship'

export const ATS_LABELS: Record<AtsPlatform, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
}

/** Area search terms become LinkedIn searches; LinkedIn throttles bursts, so
 *  the routine only runs this many per scan (in area order). */
export const MAX_AREA_LINKEDIN_SEARCHES = 8

/** Recognize a public Greenhouse / Lever / Ashby board URL. */
export function parseAtsUrl(raw: string): { platform: AtsPlatform; slug: string } | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  const seg = url.pathname.split('/').filter(Boolean)
  if (/(^|\.)greenhouse\.io$/.test(host)) {
    if (host === 'boards-api.greenhouse.io') {
      const i = seg.indexOf('boards')
      return i >= 0 && seg[i + 1] ? { platform: 'greenhouse', slug: seg[i + 1] } : null
    }
    if (seg[0] === 'embed') {
      const slug = url.searchParams.get('for')
      return slug ? { platform: 'greenhouse', slug } : null
    }
    return seg[0] ? { platform: 'greenhouse', slug: seg[0] } : null
  }
  if (host === 'jobs.lever.co' || host === 'api.lever.co') {
    const slug = host === 'api.lever.co' ? seg[2] : seg[0]
    return slug ? { platform: 'lever', slug } : null
  }
  if (host === 'jobs.ashbyhq.com') {
    return seg[0] ? { platform: 'ashby', slug: decodeURIComponent(seg[0]) } : null
  }
  return null
}

/** A search term is either a keyword ("EEG") or a pasted LinkedIn jobs search URL. */
export function linkedinSearchUrl(term: string): string {
  const t = term.trim()
  if (/^https?:\/\//i.test(t)) return t
  const q = new URLSearchParams({
    keywords: `${t} intern`,
    location: 'United States',
    f_E: '1',
    f_TPR: 'r2592000',
  })
  return `https://www.linkedin.com/jobs/search/?${q}`
}

export function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}
