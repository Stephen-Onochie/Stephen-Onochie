// Pure helpers for the ingestion API: URL normalization, dedupe keys, and the
// deterministic priority matrix. Kept separate from the route so the logic is
// easy to reason about and reuse.

import type { CityTag, Lane, Priority } from '@/types/internship'

/** Normalize a job URL for dedupe: lowercase host, drop query/hash, strip a
 *  trailing slash. Returns '' for blank/unparseable input. */
export function normalizeUrl(url: string | null | undefined): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed)
    // LinkedIn serves one job under many URLs (country subdomains, title slugs,
    // currentJobId on search pages) — collapse them all to the job id.
    if (/(^|\.)linkedin\.com$/i.test(u.hostname)) {
      const id =
        u.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)\/?$/)?.[1] ??
        u.searchParams.get('currentJobId')
      if (id) return `https://www.linkedin.com/jobs/view/${id}`
    }
    u.hash = ''
    u.search = ''
    u.hostname = u.hostname.toLowerCase()
    let out = u.toString()
    if (out.endsWith('/')) out = out.slice(0, -1)
    return out
  } catch {
    // Not an absolute URL — fall back to a lowercased, trimmed-slash form.
    return trimmed.toLowerCase().replace(/\/+$/, '')
  }
}

const COMPANY_SUFFIX = /\b(inc|incorporated|llc|l\.l\.c|ltd|limited|corp|corporation|co|company|plc|lp|llp|gmbh)\b\.?/g

function normCompany(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(COMPANY_SUFFIX, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Sources disagree on season tags in titles ("Software Engineering Intern" vs
// "Software Engineering Intern - Summer 2027"), so those are stripped.
function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(summer|fall|spring|winter)?\s*20\d\d\b/g, ' ')
    .replace(/\binternship\b/g, 'intern')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// "Indianapolis, IN" / "Indianapolis, Indiana, United States" / "Indianapolis
// Metropolitan Area" → "indianapolis". Only the first place is compared.
function normCity(s: string | null | undefined): string {
  const first = (s ?? '').split(/[,;|/]/)[0] ?? ''
  return first
    .toLowerCase()
    .replace(/\b(metropolitan|metro|greater|area)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

type DedupeInput = {
  job_url?: string | null
  company: string
  role_title: string
  location?: string | null
}

/** Every identity a posting can be matched on: its normalized URL (if any)
 *  and a fuzzy company+title+city key. Two postings are duplicates if they
 *  share ANY key — so the same job found on LinkedIn and on its Greenhouse
 *  board (different URLs) still collapses. */
export function dedupeKeys(input: DedupeInput): string[] {
  const keys: string[] = []
  const url = normalizeUrl(input.job_url)
  if (url) keys.push(`url:${url}`)
  const company = normCompany(input.company)
  const title = normTitle(input.role_title)
  if (company && title) keys.push(`crl:${company}|${title}|${normCity(input.location)}`)
  return keys
}

/** Priority matrix (PRD §3), evaluated in precedence order:
 *  1. lane1_program → high   2. indy → high
 *  3. chicago/austin/remote → medium   4. other → low */
export function computePriority(lane: Lane, cityTag: CityTag): Priority {
  if (lane === 'lane1_program') return 'high'
  if (cityTag === 'indy') return 'high'
  if (cityTag === 'chicago' || cityTag === 'austin' || cityTag === 'remote') return 'medium'
  return 'low'
}
