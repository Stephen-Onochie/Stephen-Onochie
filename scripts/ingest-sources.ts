/**
 * ingest-sources.ts — deterministic fetch + normalize layer for the internship
 * ingestion routine. Pulls the three community Summer 2027 listings.json feeds
 * and each seeded ATS board, normalizes every posting to one shape, drops
 * obvious non-internships, and prints the result as JSON to stdout.
 *
 * Pure fetch + normalize: NO secrets, NO DB access. The routine runs this, then
 * applies the season/role/lane/flag JUDGMENT before POSTing to /api/internship/ingest.
 *
 * Usage:
 *   npx tsx scripts/ingest-sources.ts                     # community feeds only
 *   echo '{"targets":[...]}' | npx tsx scripts/ingest-sources.ts   # + ATS boards
 *
 * The routine first GETs /api/internship/ingest/targets, then pipes that JSON
 * ({ targets: [{ company, ats_platform, ats_slug }] }) into this script's stdin.
 */

// ─── Community feeds ─────────────────────────────────────────────────────────
// IMPORTANT: these repos roll over by cycle and rename their files. VERIFY each
// raw URL still serves the CURRENT Summer 2027 list at routine-setup time
// (vanshb03 was still serving Summer 2026 data as of mid-2026). Use the main
// Summer list only — not off-season / new-grad JSON.
// JSON feeds publish a structured listings.json (Pitt CSC / Simplify format).
// Simplify is omitted until its current Summer 2027 raw URL is confirmed.
const JSON_FEEDS: { source: string; url: string }[] = [
  {
    source: 'feed:vanshb03',
    url: 'https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/main/.github/scripts/listings.json',
  },
]

// Markdown feeds publish their list as a table in README.md (no JSON). sndsh404
// uses columns: Company | Role | Location | [apply](url) | Added, with a 🛂
// emoji marking US-citizenship/clearance roles.
const MARKDOWN_FEEDS: { source: string; url: string }[] = [
  {
    source: 'feed:sndsh404',
    url: 'https://raw.githubusercontent.com/sndsh404/summer-2027-internships/main/README.md',
  },
]

// LinkedIn job searches. Paste any linkedin.com/jobs/search… URL here — its
// keywords, location and every f_* filter are forwarded to LinkedIn's public
// (logged-out) jobs endpoint, the same one the logged-out search page uses.
// Each search pulls up to LINKEDIN_MAX_PAGES × 10 results. Keep this list
// short: twice-daily runs × a handful of searches is a light footprint, and
// LinkedIn throttles bursts (a throttled search is reported, not fatal).
// Filter cheat-sheet: f_E=1 internship level · f_JT=I internship type ·
// f_TPR=r2592000 posted in the last 30 days · distance=50 miles.
const LINKEDIN_SEARCHES: string[] = [
  // Stephen's original search (Oct 12, 2026).
  'https://www.linkedin.com/jobs/search-results/?keywords=computer%20engineer&f_SAL=f_SA_id_226001%3A275001',
  // Indianapolis metro — the gap the community feeds don't cover.
  'https://www.linkedin.com/jobs/search/?keywords=computer%20engineering%20intern&location=Indianapolis%2C%20Indiana%2C%20United%20States&distance=50&f_E=1&f_TPR=r2592000',
  'https://www.linkedin.com/jobs/search/?keywords=software%20engineering%20intern&location=Indianapolis%2C%20Indiana%2C%20United%20States&distance=50&f_E=1&f_TPR=r2592000',
  'https://www.linkedin.com/jobs/search/?keywords=electrical%20engineering%20intern&location=Indianapolis%2C%20Indiana%2C%20United%20States&distance=50&f_E=1&f_TPR=r2592000',
]
const LINKEDIN_MAX_PAGES = 5
const LINKEDIN_PAGE_DELAY_MS = 1500

interface NormalizedPosting {
  company: string
  role_title: string
  job_url: string | null
  location: string | null
  source: string
  posted_at: string | null
}

interface Target {
  company: string
  ats_platform: 'greenhouse' | 'lever' | 'ashby'
  ats_slug: string
}

const NON_INTERNSHIP = /\b(new ?grad|full[\s-]?time|senior|staff|principal|co[\s-]?op only)\b/i
const INTERN_HINT = /\b(intern|internship|co[\s-]?op)\b/i

function looksLikeInternship(title: string): boolean {
  if (NON_INTERNSHIP.test(title)) return false
  return INTERN_HINT.test(title)
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'user-agent': 'internship-ingest/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': 'internship-ingest/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function toIso(value: unknown): string | null {
  if (value == null) return null
  // Community feeds use unix seconds; ATS boards use ms or ISO strings.
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(String(value))
  return isNaN(d.getTime()) ? null : d.toISOString()
}

// ─── Community listings.json ─────────────────────────────────────────────────
function normalizeCommunity(raw: unknown, source: string): NormalizedPosting[] {
  if (!Array.isArray(raw)) return []
  const out: NormalizedPosting[] = []
  for (const item of raw as Record<string, unknown>[]) {
    const title = String(item.title ?? '')
    const company = String(item.company_name ?? item.company ?? '')
    if (!company || !looksLikeInternship(title)) continue
    // Skip inactive/closed listings when the feed marks them.
    if (item.active === false || item.is_visible === false) continue

    const locations = item.locations
    const location = Array.isArray(locations)
      ? locations.join(', ')
      : item.location
        ? String(item.location)
        : null

    out.push({
      company,
      role_title: title,
      job_url: item.url ? String(item.url) : null,
      location,
      source,
      posted_at: toIso(item.date_posted ?? item.date_updated ?? null),
    })
  }
  return out
}

// ─── Community README.md table ───────────────────────────────────────────────
// Pull the first markdown link's href out of a cell: "[apply](https://…)".
function firstMarkdownLink(cell: string): string | null {
  const m = cell.match(/\]\((https?:\/\/[^)\s]+)\)/)
  return m ? m[1] : null
}

function normalizeMarkdown(md: string, source: string): NormalizedPosting[] {
  const out: NormalizedPosting[] = []
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue
    // Split the row into cells, dropping the leading/trailing pipe artifacts.
    const cells = line.split('|').slice(1, -1).map(c => c.trim())
    if (cells.length < 4) continue
    const [company, role, location, apply, added] = cells
    // Skip the header and separator rows.
    if (!company || company === 'Company' || /^-+$/.test(company)) continue

    const job_url = firstMarkdownLink(apply ?? '')
    // The 🛂 emoji marks work-auth-required roles; strip it from the visible
    // title (the routine re-derives work_auth_flag from the description anyway).
    const role_title = (role ?? '').replace(/🛂/g, '').trim()
    if (!role_title || !looksLikeInternship(role_title)) continue

    out.push({
      company,
      role_title,
      job_url,
      location: location || null,
      source,
      posted_at: toIso(added ?? null),
    })
  }
  return out
}

// ─── ATS boards ──────────────────────────────────────────────────────────────
async function fetchGreenhouse(slug: string, company: string): Promise<NormalizedPosting[]> {
  const data = (await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`
  )) as { jobs?: Record<string, unknown>[] }
  return (data.jobs ?? [])
    .map(j => ({
      company,
      role_title: String(j.title ?? ''),
      job_url: j.absolute_url ? String(j.absolute_url) : null,
      location: (j.location as { name?: string } | undefined)?.name ?? null,
      source: `ats:greenhouse:${slug}`,
      posted_at: toIso(j.updated_at ?? null),
    }))
    .filter(p => looksLikeInternship(p.role_title))
}

async function fetchLever(slug: string, company: string): Promise<NormalizedPosting[]> {
  const data = (await fetchJson(
    `https://api.lever.co/v0/postings/${slug}?mode=json`
  )) as Record<string, unknown>[]
  return (Array.isArray(data) ? data : [])
    .map(j => ({
      company,
      role_title: String(j.text ?? ''),
      job_url: j.hostedUrl ? String(j.hostedUrl) : null,
      location:
        (j.categories as { location?: string } | undefined)?.location ?? null,
      source: `ats:lever:${slug}`,
      posted_at: toIso(j.createdAt ?? null),
    }))
    .filter(p => looksLikeInternship(p.role_title))
}

async function fetchAshby(slug: string, company: string): Promise<NormalizedPosting[]> {
  const data = (await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`
  )) as { jobs?: Record<string, unknown>[] }
  return (data.jobs ?? [])
    .map(j => ({
      company,
      role_title: String(j.title ?? ''),
      job_url: j.jobUrl ? String(j.jobUrl) : null,
      location: j.location ? String(j.location) : null,
      source: `ats:ashby:${slug}`,
      posted_at: toIso(j.publishedAt ?? j.updatedAt ?? null),
    }))
    .filter(p => looksLikeInternship(p.role_title))
}

async function fetchAts(t: Target): Promise<NormalizedPosting[]> {
  switch (t.ats_platform) {
    case 'greenhouse':
      return fetchGreenhouse(t.ats_slug, t.company)
    case 'lever':
      return fetchLever(t.ats_slug, t.company)
    case 'ashby':
      return fetchAshby(t.ats_slug, t.company)
    default:
      return []
  }
}

// ─── LinkedIn (logged-out jobs search) ───────────────────────────────────────
const LINKEDIN_GUEST_API =
  'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search'
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function textOf(html: string | undefined): string {
  return decodeEntities((html ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/** Turn a pasted linkedin.com/jobs/search URL into guest-API query params:
 *  keywords, location, geoId, distance and every f_* filter. Tracking params
 *  (currentJobId, origin, refId…) are dropped. */
function linkedinQuery(searchUrl: string): URLSearchParams {
  const src = new URL(searchUrl).searchParams
  const out = new URLSearchParams()
  src.forEach((v, k) => {
    if (['keywords', 'location', 'geoId', 'distance', 'sortBy'].includes(k) || k.startsWith('f_')) {
      out.set(k, v)
    }
  })
  return out
}

/** Parse one page of guest-API HTML (a list of <li> job cards). */
function parseLinkedinCards(html: string): NormalizedPosting[] {
  const out: NormalizedPosting[] = []
  for (const card of html.split(/<li[\s>]/).slice(1)) {
    const id = card.match(/urn:li:jobPosting:(\d+)/)?.[1]
    if (!id) continue
    const role_title = textOf(card.match(/class="base-search-card__title"[^>]*>([\s\S]*?)<\/h3>/)?.[1])
    const company = textOf(card.match(/class="base-search-card__subtitle"[^>]*>([\s\S]*?)<\/h4>/)?.[1])
    const location = textOf(card.match(/class="job-search-card__location"[^>]*>([\s\S]*?)<\/span>/)?.[1])
    const posted = card.match(/class="job-search-card__listdate[^"]*"\s+datetime="([^"]+)"/)?.[1]
    if (!role_title || !company) continue
    out.push({
      company,
      role_title,
      // Canonical form — the card's href carries per-search tracking params
      // and a title slug, so the bare job id is the stable identity.
      job_url: `https://www.linkedin.com/jobs/view/${id}`,
      location: location || null,
      source: 'board:linkedin',
      posted_at: toIso(posted ?? null),
    })
  }
  return out
}

async function fetchLinkedinSearch(searchUrl: string): Promise<NormalizedPosting[]> {
  const query = linkedinQuery(searchUrl)
  const out: NormalizedPosting[] = []
  for (let page = 0; page < LINKEDIN_MAX_PAGES; page++) {
    query.set('start', String(page * 10))
    if (page > 0) await sleep(LINKEDIN_PAGE_DELAY_MS)
    const res = await fetch(`${LINKEDIN_GUEST_API}?${query}`, {
      headers: { 'user-agent': BROWSER_UA, 'accept-language': 'en-US,en;q=0.9' },
    })
    // 400 past the last page is normal; 429 means throttled — keep what we have
    // unless the very first page failed.
    if (!res.ok) {
      if (page === 0) throw new Error(`HTTP ${res.status}`)
      break
    }
    const cards = parseLinkedinCards(await res.text())
    if (cards.length === 0) break
    out.push(...cards)
  }
  return out
}

// ─── stdin (optional targets payload) ────────────────────────────────────────
async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return ''
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8').trim()
}

async function main() {
  const failed: string[] = []
  const postings: NormalizedPosting[] = []

  // Community JSON feeds.
  for (const feed of JSON_FEEDS) {
    try {
      const raw = await fetchJson(feed.url)
      postings.push(...normalizeCommunity(raw, feed.source))
    } catch (e) {
      failed.push(`${feed.source} (${(e as Error).message})`)
    }
  }

  // Community markdown (README.md) feeds.
  for (const feed of MARKDOWN_FEEDS) {
    try {
      const md = await fetchText(feed.url)
      postings.push(...normalizeMarkdown(md, feed.source))
    } catch (e) {
      failed.push(`${feed.source} (${(e as Error).message})`)
    }
  }

  // LinkedIn searches. The same job often appears in several searches (and on
  // several pages as results shift), so collapse by job URL before emitting.
  const linkedinSeen = new Set<string>()
  for (let i = 0; i < LINKEDIN_SEARCHES.length; i++) {
    const searchUrl = LINKEDIN_SEARCHES[i]
    try {
      if (i > 0) await sleep(LINKEDIN_PAGE_DELAY_MS)
      for (const p of await fetchLinkedinSearch(searchUrl)) {
        if (!looksLikeInternship(p.role_title)) continue
        if (linkedinSeen.has(p.job_url!)) continue
        linkedinSeen.add(p.job_url!)
        postings.push(p)
      }
    } catch (e) {
      const kw = new URL(searchUrl).searchParams.get('keywords') ?? searchUrl
      failed.push(`board:linkedin "${kw}" (${(e as Error).message})`)
    }
  }

  // ATS targets from stdin, if any.
  const stdin = await readStdin()
  if (stdin) {
    let targets: Target[] = []
    try {
      const parsed = JSON.parse(stdin) as { targets?: Target[] }
      targets = parsed.targets ?? []
    } catch {
      failed.push('stdin (invalid JSON targets payload)')
    }
    for (const t of targets) {
      try {
        postings.push(...(await fetchAts(t)))
      } catch (e) {
        failed.push(`ats:${t.ats_platform}:${t.ats_slug} (${(e as Error).message})`)
      }
    }
  }

  process.stdout.write(
    JSON.stringify({ postings, failed_sources: failed, count: postings.length }, null, 2)
  )
  process.stdout.write('\n')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
