import type { SupabaseClient } from '@supabase/supabase-js'
import type { WatchDetails, WatchItem, WatchSearchResult } from '@/types/watchlist'

const UNIQUE_VIOLATION = '23505'

export class DuplicateWatchItemError extends Error {
  constructor() {
    super('Already on your list')
  }
}

export async function fetchWatchItems(supabase: SupabaseClient, userId: string): Promise<WatchItem[]> {
  const { data, error } = await supabase
    .from('watch_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WatchItem[]
}

export async function insertFromSearch(
  supabase: SupabaseClient,
  userId: string,
  result: WatchSearchResult
): Promise<WatchItem> {
  const { data, error } = await supabase
    .from('watch_items')
    .insert({
      user_id: userId,
      tmdb_id: result.tmdbId,
      tmdb_type: result.type,
      kind: result.suggestedKind,
      title: result.title,
      year: result.year,
      poster_url: result.posterUrl,
      backdrop_url: result.backdropUrl,
    })
    .select('*')
    .single()
  if (error?.code === UNIQUE_VIOLATION) throw new DuplicateWatchItemError()
  if (error) throw error
  return data as WatchItem
}

export async function insertTitleOnly(supabase: SupabaseClient, userId: string, title: string): Promise<WatchItem> {
  const { data, error } = await supabase
    .from('watch_items')
    .insert({ user_id: userId, title })
    .select('*')
    .single()
  if (error) throw error
  return data as WatchItem
}

export async function updateWatchItem(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<WatchItem>
): Promise<WatchItem> {
  const { data, error } = await supabase
    .from('watch_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error?.code === UNIQUE_VIOLATION) throw new DuplicateWatchItemError()
  if (error) throw error
  return data as WatchItem
}

export async function deleteWatchItem(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('watch_items').delete().eq('id', id)
  if (error) throw error
}

// The unique partial index allows one featured title, so clear the others first.
export async function setFeatured(supabase: SupabaseClient, userId: string, id: string, featured: boolean) {
  if (featured) {
    const { error } = await supabase
      .from('watch_items')
      .update({ is_public_current: false })
      .eq('user_id', userId)
      .eq('is_public_current', true)
    if (error) throw error
  }
  return updateWatchItem(supabase, id, { is_public_current: featured })
}

// Browser-side calls into the server routes that hold the TMDB token.
export async function searchWatchTitles(query: string, signal?: AbortSignal): Promise<WatchSearchResult[]> {
  const res = await fetch(`/api/watchlist/search?q=${encodeURIComponent(query)}`, { signal })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Search failed')
  return data.results as WatchSearchResult[]
}

export async function loadWatchDetails(type: 'movie' | 'tv', tmdbId: number): Promise<WatchDetails> {
  const res = await fetch(`/api/watchlist/details?type=${type}&id=${tmdbId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Could not load details')
  return data.details as WatchDetails
}

// Fields copied from a fresh details snapshot onto the row. `kind` is only
// applied when the caller asks (at add/relink time), so a manual type override
// survives later refreshes.
export function detailsPatch(details: WatchDetails, applyKind: boolean): Partial<WatchItem> {
  return {
    details,
    details_refreshed_at: new Date().toISOString(),
    title: details.title,
    year: details.year,
    poster_url: details.posterUrl,
    backdrop_url: details.backdropUrl,
    mal_id: details.anime?.malId ?? null,
    ...(applyKind ? { kind: details.suggestedKind } : {}),
  }
}
