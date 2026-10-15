export type WatchKind = 'movie' | 'tv' | 'anime' | 'nollywood'
export type WatchStatus = 'watchlist' | 'watching' | 'paused' | 'watched' | 'dropped'
export type TmdbType = 'movie' | 'tv'

export interface WatchProvider {
  name: string
  logoUrl: string | null
}

export interface WatchProviders {
  link: string | null
  stream: WatchProvider[]
  free: WatchProvider[]
  rent: WatchProvider[]
  buy: WatchProvider[]
}

export interface WatchCastMember {
  name: string
  character: string | null
  profileUrl: string | null
}

export interface WatchSeason {
  number: number
  name: string
  episodeCount: number
  airYear: number | null
}

export interface AnimeInfo {
  source: 'jikan' | 'anilist'
  malId: number | null
  malUrl: string | null
  url: string
  // Jikan reports the MAL score (0-10); AniList reports its own average (0-100),
  // normalised here to 0-10 and labelled by source.
  score: number | null
  episodes: number | null
  studios: string[]
  airingStatus: string | null
}

// The cached snapshot stored in watch_items.details.
export interface WatchDetails {
  tmdbId: number
  type: TmdbType
  title: string
  originalTitle: string | null
  tagline: string | null
  overview: string | null
  posterUrl: string | null
  backdropUrl: string | null
  year: number | null
  releaseDate: string | null
  runtimeMinutes: number | null
  genres: string[]
  tmdbScore: number | null
  tmdbVotes: number
  showStatus: string | null
  originCountries: string[]
  originalLanguage: string | null
  creators: string[]
  creatorLabel: 'Directed by' | 'Created by'
  cast: WatchCastMember[]
  seasons: WatchSeason[]
  totalEpisodes: number | null
  trailerKey: string | null
  providers: WatchProviders | null
  imdbId: string | null
  suggestedKind: WatchKind
  anime: AnimeInfo | null
}

export interface WatchSearchResult {
  tmdbId: number
  type: TmdbType
  title: string
  originalTitle: string | null
  year: number | null
  posterUrl: string | null
  backdropUrl: string | null
  overview: string | null
  suggestedKind: WatchKind
}

export interface WatchItem {
  id: string
  user_id: string
  tmdb_id: number | null
  tmdb_type: TmdbType | null
  mal_id: number | null
  kind: WatchKind
  title: string
  year: number | null
  poster_url: string | null
  backdrop_url: string | null
  status: WatchStatus
  rating: number | null
  notes: string | null
  current_season: number | null
  current_episode: number | null
  started_on: string | null
  finished_on: string | null
  is_public_current: boolean
  details: WatchDetails | null
  details_refreshed_at: string | null
  created_at: string
  updated_at: string
}

// Shape returned by /api/public/current-watch.
export interface PublicCurrentWatch {
  title: string
  kind: WatchKind
  year: number | null
  posterUrl: string | null
  genres: string[]
  progressLabel: string | null
  progressPct: number | null
}

export const KIND_LABELS: Record<WatchKind, string> = {
  movie: 'Movie',
  tv: 'TV',
  anime: 'Anime',
  nollywood: 'Nollywood',
}

export const STATUS_LABELS: Record<WatchStatus, string> = {
  watchlist: 'Watchlist',
  watching: 'Watching',
  paused: 'Paused',
  watched: 'Watched',
  dropped: 'Dropped',
}
