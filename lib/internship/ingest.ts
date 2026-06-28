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

/** Dedupe key for a posting: normalized URL when present, else a composite of
 *  company + role_title + location (all lowercased/trimmed). */
export function dedupeKey(input: {
  job_url?: string | null
  company: string
  role_title: string
  location?: string | null
}): string {
  const url = normalizeUrl(input.job_url)
  if (url) return `url:${url}`
  const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()
  return `crl:${norm(input.company)}|${norm(input.role_title)}|${norm(input.location)}`
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
