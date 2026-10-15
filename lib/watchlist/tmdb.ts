import type {
  TmdbType,
  WatchCastMember,
  WatchDetails,
  WatchKind,
  WatchProvider,
  WatchProviders,
  WatchSearchResult,
  WatchSeason,
} from '@/types/watchlist'
import { fetchAnimeInfo } from './anime'

// Server-only TMDB client. The read token never leaves the server; the browser
// talks to /api/watchlist/* instead.

const API = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'
const ANIMATION_GENRE_ID = 16
const NIGERIAN_LANGUAGES = ['yo', 'ig', 'ha', 'pcm']

export class TmdbNotConfiguredError extends Error {
  constructor() {
    super('TMDB_READ_TOKEN is not set')
  }
}

function img(path: string | null | undefined, size: 'w92' | 'w185' | 'w342' | 'w780' | 'w1280') {
  return path ? `${IMG}/${size}${path}` : null
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN
  if (!token) throw new TmdbNotConfiguredError()
  const qs = new URLSearchParams({ language: 'en-US', ...params })
  const res = await fetch(`${API}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

function yearOf(date: string | null | undefined): number | null {
  if (!date) return null
  const y = parseInt(date.slice(0, 4), 10)
  return Number.isFinite(y) ? y : null
}

export function classifyKind(input: {
  type: TmdbType
  genreIds: number[]
  originalLanguage: string | null
  originCountries: string[]
}): WatchKind {
  const { type, genreIds, originalLanguage, originCountries } = input
  if (originCountries.includes('NG') || (originalLanguage && NIGERIAN_LANGUAGES.includes(originalLanguage))) {
    return 'nollywood'
  }
  const japanese = originalLanguage === 'ja' || originCountries.includes('JP')
  if (genreIds.includes(ANIMATION_GENRE_ID) && japanese) return 'anime'
  return type
}

// ─── Search ──────────────────────────────────────────────────────

interface TmdbMultiResult {
  id: number
  media_type: 'movie' | 'tv' | 'person'
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string
  genre_ids?: number[]
  original_language?: string
  origin_country?: string[]
  popularity?: number
}

export async function searchTitles(query: string): Promise<WatchSearchResult[]> {
  const data = await tmdb<{ results: TmdbMultiResult[] }>('/search/multi', {
    query,
    include_adult: 'false',
    page: '1',
  })

  const titles = data.results.filter(
    (r): r is TmdbMultiResult & { media_type: TmdbType } => r.media_type === 'movie' || r.media_type === 'tv'
  )
  // Keep TMDB's relevance order, but sink posterless stubs below real entries.
  const ranked = [...titles.filter(r => r.poster_path), ...titles.filter(r => !r.poster_path)]

  return ranked.slice(0, 8).map(r => {
    const title = (r.media_type === 'movie' ? r.title : r.name) ?? 'Untitled'
    const originalTitle = (r.media_type === 'movie' ? r.original_title : r.original_name) ?? null
    return {
      tmdbId: r.id,
      type: r.media_type,
      title,
      originalTitle: originalTitle && originalTitle !== title ? originalTitle : null,
      year: yearOf(r.media_type === 'movie' ? r.release_date : r.first_air_date),
      posterUrl: img(r.poster_path, 'w342'),
      backdropUrl: img(r.backdrop_path, 'w1280'),
      overview: r.overview || null,
      suggestedKind: classifyKind({
        type: r.media_type,
        genreIds: r.genre_ids ?? [],
        originalLanguage: r.original_language ?? null,
        originCountries: r.origin_country ?? [],
      }),
    }
  })
}

// ─── Details ─────────────────────────────────────────────────────

interface TmdbProviderEntry {
  provider_name: string
  logo_path: string | null
  display_priority: number
}

interface TmdbVideo {
  site: string
  type: string
  official: boolean
  key: string
}

interface TmdbDetailsBase {
  id: number
  overview: string
  tagline?: string
  poster_path: string | null
  backdrop_path: string | null
  genres: { id: number; name: string }[]
  vote_average: number
  vote_count: number
  status: string
  original_language: string
  origin_country?: string[]
  production_countries?: { iso_3166_1: string }[]
  videos?: { results: TmdbVideo[] }
  'watch/providers'?: {
    results: Record<string, {
      link?: string
      flatrate?: TmdbProviderEntry[]
      free?: TmdbProviderEntry[]
      ads?: TmdbProviderEntry[]
      rent?: TmdbProviderEntry[]
      buy?: TmdbProviderEntry[]
    }>
  }
  external_ids?: { imdb_id?: string | null }
}

interface TmdbMovieDetails extends TmdbDetailsBase {
  title: string
  original_title: string
  release_date: string
  runtime: number | null
  credits?: {
    cast: { name: string; character: string; profile_path: string | null }[]
    crew: { name: string; job: string }[]
  }
}

interface TmdbTvDetails extends TmdbDetailsBase {
  name: string
  original_name: string
  first_air_date: string
  episode_run_time: number[]
  last_episode_to_air?: { runtime: number | null } | null
  number_of_episodes: number | null
  created_by: { name: string }[]
  seasons: { season_number: number; name: string; episode_count: number; air_date: string | null }[]
  aggregate_credits?: {
    cast: { name: string; profile_path: string | null; roles: { character: string }[] }[]
  }
}

function pickTrailer(videos: TmdbVideo[]): string | null {
  const youtube = videos.filter(v => v.site === 'YouTube')
  const best =
    youtube.find(v => v.type === 'Trailer' && v.official) ??
    youtube.find(v => v.type === 'Trailer') ??
    youtube.find(v => v.type === 'Teaser') ??
    youtube[0]
  return best?.key ?? null
}

function mapProviders(details: TmdbDetailsBase): WatchProviders | null {
  const us = details['watch/providers']?.results?.US
  if (!us) return null
  const list = (entries?: TmdbProviderEntry[]): WatchProvider[] =>
    [...(entries ?? [])]
      .sort((a, b) => a.display_priority - b.display_priority)
      .map(p => ({ name: p.provider_name, logoUrl: img(p.logo_path, 'w92') }))
  const providers: WatchProviders = {
    link: us.link ?? null,
    stream: list(us.flatrate),
    free: list([...(us.free ?? []), ...(us.ads ?? [])]),
    rent: list(us.rent),
    buy: list(us.buy),
  }
  const empty = !providers.stream.length && !providers.free.length && !providers.rent.length && !providers.buy.length
  return empty ? null : providers
}

function originCountriesOf(details: TmdbDetailsBase): string[] {
  const set = new Set<string>(details.origin_country ?? [])
  details.production_countries?.forEach(c => set.add(c.iso_3166_1))
  return Array.from(set)
}

export async function fetchDetails(type: TmdbType, id: number): Promise<WatchDetails> {
  const append = type === 'movie'
    ? 'credits,videos,watch/providers,external_ids'
    : 'aggregate_credits,videos,watch/providers,external_ids'
  // Nollywood and anime trailers are often tagged with no language or Japanese,
  // so widen the video language filter beyond the en-US default.
  const params = { append_to_response: append, include_video_language: 'en,null,ja,yo' }

  if (type === 'movie') {
    const d = await tmdb<TmdbMovieDetails>(`/movie/${id}`, params)
    const originCountries = originCountriesOf(d)
    const suggestedKind = classifyKind({
      type,
      genreIds: d.genres.map(g => g.id),
      originalLanguage: d.original_language,
      originCountries,
    })
    const year = yearOf(d.release_date)
    const anime = suggestedKind === 'anime'
      ? await fetchAnimeInfo({ title: d.title, originalTitle: d.original_title, year, type })
      : null
    const cast: WatchCastMember[] = (d.credits?.cast ?? []).slice(0, 12).map(c => ({
      name: c.name,
      character: c.character || null,
      profileUrl: img(c.profile_path, 'w185'),
    }))
    return {
      tmdbId: d.id,
      type,
      title: d.title,
      originalTitle: d.original_title !== d.title ? d.original_title : null,
      tagline: d.tagline || null,
      overview: d.overview || null,
      posterUrl: img(d.poster_path, 'w342'),
      backdropUrl: img(d.backdrop_path, 'w1280'),
      year,
      releaseDate: d.release_date || null,
      runtimeMinutes: d.runtime || null,
      genres: d.genres.map(g => g.name),
      tmdbScore: d.vote_count ? Math.round(d.vote_average * 10) / 10 : null,
      tmdbVotes: d.vote_count,
      showStatus: d.status || null,
      originCountries,
      originalLanguage: d.original_language || null,
      creators: (d.credits?.crew ?? []).filter(c => c.job === 'Director').map(c => c.name),
      creatorLabel: 'Directed by',
      cast,
      seasons: [],
      totalEpisodes: null,
      trailerKey: pickTrailer(d.videos?.results ?? []),
      providers: mapProviders(d),
      imdbId: d.external_ids?.imdb_id ?? null,
      suggestedKind,
      anime,
    }
  }

  const d = await tmdb<TmdbTvDetails>(`/tv/${id}`, params)
  const originCountries = originCountriesOf(d)
  const suggestedKind = classifyKind({
    type,
    genreIds: d.genres.map(g => g.id),
    originalLanguage: d.original_language,
    originCountries,
  })
  const year = yearOf(d.first_air_date)
  const anime = suggestedKind === 'anime'
    ? await fetchAnimeInfo({ title: d.name, originalTitle: d.original_name, year, type })
    : null
  // Season 0 is TMDB's "Specials" bucket; progress tracking only walks real seasons.
  const seasons: WatchSeason[] = d.seasons
    .filter(s => s.season_number > 0 && s.episode_count > 0)
    .map(s => ({
      number: s.season_number,
      name: s.name,
      episodeCount: s.episode_count,
      airYear: yearOf(s.air_date),
    }))
  const cast: WatchCastMember[] = (d.aggregate_credits?.cast ?? []).slice(0, 12).map(c => ({
    name: c.name,
    character: c.roles[0]?.character || null,
    profileUrl: img(c.profile_path, 'w185'),
  }))
  return {
    tmdbId: d.id,
    type,
    title: d.name,
    originalTitle: d.original_name !== d.name ? d.original_name : null,
    tagline: d.tagline || null,
    overview: d.overview || null,
    posterUrl: img(d.poster_path, 'w342'),
    backdropUrl: img(d.backdrop_path, 'w1280'),
    year,
    releaseDate: d.first_air_date || null,
    runtimeMinutes: d.episode_run_time[0] ?? d.last_episode_to_air?.runtime ?? null,
    genres: d.genres.map(g => g.name),
    tmdbScore: d.vote_count ? Math.round(d.vote_average * 10) / 10 : null,
    tmdbVotes: d.vote_count,
    showStatus: d.status || null,
    originCountries,
    originalLanguage: d.original_language || null,
    creators: d.created_by.map(c => c.name),
    creatorLabel: 'Created by',
    cast,
    seasons,
    totalEpisodes: seasons.reduce((sum, s) => sum + s.episodeCount, 0) || null,
    trailerKey: pickTrailer(d.videos?.results ?? []),
    providers: mapProviders(d),
    imdbId: d.external_ids?.imdb_id ?? null,
    suggestedKind,
    anime,
  }
}
