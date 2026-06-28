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
