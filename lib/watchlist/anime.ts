import type { AnimeInfo, TmdbType } from '@/types/watchlist'

// Anime enrichment: Jikan (MyAnimeList) first, AniList as the fallback. Jikan is
// free but frequently slow or down, so it gets a short timeout; AniList also
// carries the MAL id, so the MAL link survives the fallback.

const TIMEOUT_MS = 3000

interface AnimeQuery {
  title: string
  originalTitle: string | null
  year: number | null
  type: TmdbType
}

interface JikanAnime {
  mal_id: number
  url: string
  type: string | null
  episodes: number | null
  score: number | null
  members: number | null
  status: string | null
  studios: { name: string }[]
  aired: { prop?: { from?: { year?: number | null } } }
}

interface AniListMedia {
  idMal: number | null
  siteUrl: string
  format: string | null
  episodes: number | null
  averageScore: number | null
  popularity: number | null
  status: string | null
  seasonYear: number | null
  startDate: { year: number | null } | null
  studios: { nodes: { name: string }[] }
}

// A franchise search returns every season, movie, short and OVA. Prefer the
// exact format (TV series vs film), then entries from the TMDB premiere year,
// then the most popular, which is almost always the main series.
interface Candidate<T> {
  item: T
  format: 'tv' | 'movie' | 'other'
  year: number | null
  popularity: number
}

function pickBest<T>(candidates: Candidate<T>[], year: number | null, type: TmdbType): T | null {
  if (!candidates.length) return null
  const exact = candidates.filter(c => c.format === type)
  const pool = exact.length ? exact : candidates.filter(c => c.format !== (type === 'tv' ? 'movie' : 'tv'))
  const base = pool.length ? pool : candidates
  const sameYear = year == null ? [] : base.filter(c => c.year != null && Math.abs(c.year - year) <= 1)
  const finalPool = sameYear.length ? sameYear : base
  return finalPool.reduce((a, b) => (b.popularity > a.popularity ? b : a)).item
}

async function fromJikan(search: string, q: AnimeQuery): Promise<AnimeInfo | null> {
  const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(search)}&limit=8&sfw=true`
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate: 86400 } })
  if (!res.ok) throw new Error(`Jikan ${res.status}`)
  const data: { data?: JikanAnime[] } = await res.json()
  const best = pickBest(
    (data.data ?? []).map(a => ({
      item: a,
      format: a.type === 'TV' ? 'tv' : a.type === 'Movie' ? 'movie' : 'other',
      year: a.aired.prop?.from?.year ?? null,
      popularity: a.members ?? 0,
    })),
    q.year,
    q.type
  )
  if (!best) return null
  return {
    source: 'jikan',
    malId: best.mal_id,
    malUrl: best.url,
    url: best.url,
    score: best.score,
    episodes: best.episodes,
    studios: best.studios.map(s => s.name),
    airingStatus: best.status,
  }
}

const ANILIST_QUERY = `query ($search: String) {
  Page(perPage: 8) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      idMal siteUrl format episodes averageScore popularity status seasonYear
      startDate { year }
      studios(isMain: true) { nodes { name } }
    }
  }
}`

async function fromAniList(search: string, q: AnimeQuery): Promise<AnimeInfo | null> {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: ANILIST_QUERY, variables: { search } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`AniList ${res.status}`)
  const data: { data?: { Page?: { media?: AniListMedia[] } } } = await res.json()
  const best = pickBest(
    (data.data?.Page?.media ?? []).map(m => ({
      item: m,
      format: m.format === 'TV' ? 'tv' : m.format === 'MOVIE' ? 'movie' : 'other',
      year: m.seasonYear ?? m.startDate?.year ?? null,
      popularity: m.popularity ?? 0,
    })),
    q.year,
    q.type
  )
  if (!best) return null
  return {
    source: 'anilist',
    malId: best.idMal,
    malUrl: best.idMal ? `https://myanimelist.net/anime/${best.idMal}` : null,
    url: best.siteUrl,
    score: best.averageScore != null ? best.averageScore / 10 : null,
    episodes: best.episodes,
    studios: best.studios.nodes.map(s => s.name),
    airingStatus: best.status ? best.status.replace(/_/g, ' ').toLowerCase() : null,
  }
}

export async function fetchAnimeInfo(q: AnimeQuery): Promise<AnimeInfo | null> {
  const searches = [q.title, q.originalTitle].filter((s): s is string => !!s)
  for (const lookup of [fromJikan, fromAniList]) {
    try {
      for (const search of searches) {
        const info = await lookup(search, q)
        if (info) return info
      }
    } catch {
      // Source is down or timed out: skip its remaining spellings, try the next source.
    }
  }
  return null
}
