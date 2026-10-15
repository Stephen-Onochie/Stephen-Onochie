import type { WatchItem } from '@/types/watchlist'

// Episode progress helpers shared by the app and the public card. Progress is
// stored as (current_season, current_episode) = the last episode watched;
// episode 0 means the season hasn't been started.

export interface ProgressSummary {
  watched: number
  total: number | null
  pct: number | null
  label: string
  atEnd: boolean
}

export function isEpisodic(item: Pick<WatchItem, 'tmdb_type' | 'kind'>) {
  return item.tmdb_type === 'tv' || item.kind === 'tv'
}

export function progressSummary(item: WatchItem): ProgressSummary | null {
  if (!isEpisodic(item) || item.current_season == null) return null
  const seasons = item.details?.seasons ?? []
  const season = item.current_season
  const episode = item.current_episode ?? 0
  const label = `S${season} · E${episode}`
  if (!seasons.length) return { watched: episode, total: null, pct: null, label, atEnd: false }

  const before = seasons.filter(s => s.number < season).reduce((sum, s) => sum + s.episodeCount, 0)
  const total = seasons.reduce((sum, s) => sum + s.episodeCount, 0)
  const watched = Math.min(before + episode, total)
  const last = seasons[seasons.length - 1]
  return {
    watched,
    total,
    pct: total ? Math.round((watched / total) * 100) : null,
    label,
    atEnd: season >= last.number && episode >= last.episodeCount,
  }
}

// The (season, episode) after logging one more episode, rolling into the next
// season when the current one is finished. Stays put at the final episode.
export function nextEpisode(item: WatchItem): { season: number; episode: number } {
  const seasons = item.details?.seasons ?? []
  const season = item.current_season ?? seasons[0]?.number ?? 1
  const episode = item.current_episode ?? 0
  const current = seasons.find(s => s.number === season)
  if (current && episode >= current.episodeCount) {
    const next = seasons.find(s => s.number > season)
    if (next) return { season: next.number, episode: 1 }
    return { season, episode }
  }
  return { season, episode: episode + 1 }
}

export function finalEpisode(item: WatchItem): { season: number; episode: number } | null {
  const seasons = item.details?.seasons ?? []
  const last = seasons[seasons.length - 1]
  return last ? { season: last.number, episode: last.episodeCount } : null
}
