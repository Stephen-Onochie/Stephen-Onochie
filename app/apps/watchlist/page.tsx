'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clapperboard, Shuffle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import IvenModule from '@/components/iven/IvenModule'
import { useIvenDarkMode } from '@/components/iven/IvenDarkModeContext'
import TitleSearch from '@/components/watchlist/TitleSearch'
import PosterCard from '@/components/watchlist/PosterCard'
import DetailDialog, { type DetailActions } from '@/components/watchlist/DetailDialog'
import PickForMe from '@/components/watchlist/PickForMe'
import { Chip } from '@/components/watchlist/shared'
import {
  deleteWatchItem,
  detailsPatch,
  DuplicateWatchItemError,
  fetchWatchItems,
  insertFromSearch,
  insertTitleOnly,
  loadWatchDetails,
  setFeatured,
  updateWatchItem,
} from '@/lib/watchlist/supabase'
import { finalEpisode, isEpisodic, nextEpisode, progressSummary } from '@/lib/watchlist/progress'
import { todayEastern } from '@/lib/dates'
import {
  KIND_LABELS,
  STATUS_LABELS,
  type WatchItem,
  type WatchKind,
  type WatchSearchResult,
  type WatchStatus,
} from '@/types/watchlist'

const STATUSES: WatchStatus[] = ['watchlist', 'watching', 'paused', 'watched', 'dropped']
const KINDS: WatchKind[] = ['movie', 'tv', 'anime', 'nollywood']
const STALE_MS = 7 * 24 * 60 * 60 * 1000

type SortKey = 'added' | 'updated' | 'rating' | 'release' | 'title'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'added', label: 'Recently added' },
  { key: 'updated', label: 'Recently updated' },
  { key: 'rating', label: 'Your rating' },
  { key: 'release', label: 'Release year' },
  { key: 'title', label: 'Title' },
]

const EMPTY_COPY: Record<WatchStatus, string> = {
  watchlist: 'Nothing saved yet. Type a title above to add your first one.',
  watching: 'Not watching anything right now. Pick for me can choose something.',
  paused: 'Nothing on hold.',
  watched: 'Finished titles land here.',
  dropped: 'Nothing dropped.',
}

function sortItems(items: WatchItem[], key: SortKey) {
  const sorted = [...items]
  switch (key) {
    case 'added':
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    case 'updated':
      return sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    case 'rating':
      return sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
    case 'release':
      return sorted.sort((a, b) => (b.year ?? -1) - (a.year ?? -1))
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
  }
}

export default function WatchlistPage() {
  const supabase = useMemo(() => createClient(), [])
  const { dark } = useIvenDarkMode()

  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<WatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<WatchStatus>('watchlist')
  const [kind, setKind] = useState<WatchKind | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('added')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set())
  const [pickOpen, setPickOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)
      setItems(await fetchWatchItems(supabase, session.user.id))
      setLoading(false)
    })()
  }, [supabase])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(id)
  }, [toast])

  const replace = useCallback((next: WatchItem) => {
    setItems(prev => prev.map(i => (i.id === next.id ? next : i)))
  }, [])

  const run = useCallback(async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (err) {
      console.error(err)
      setToast(err instanceof DuplicateWatchItemError ? err.message : 'Something went wrong. Try again.')
    }
  }, [])

  const hydrateDetails = useCallback(async (item: WatchItem, applyKind: boolean) => {
    if (!item.tmdb_id || !item.tmdb_type) return
    setRefreshing(prev => new Set(prev).add(item.id))
    try {
      const details = await loadWatchDetails(item.tmdb_type, item.tmdb_id)
      replace(await updateWatchItem(supabase, item.id, detailsPatch(details, applyKind)))
    } catch (err) {
      console.error('details refresh failed:', err)
    } finally {
      setRefreshing(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }, [supabase, replace])

  // The patch that moving to a status implies: dates, episode progress, and
  // keeping the public "Currently Watching" card pointed at something current.
  const statusPatch = useCallback((item: WatchItem, next: WatchStatus): Partial<WatchItem> => {
    const patch: Partial<WatchItem> = { status: next }
    const today = todayEastern()
    if (next === 'watching') {
      if (!item.started_on) patch.started_on = today
      patch.finished_on = null
      if (isEpisodic(item) && item.current_season == null) {
        patch.current_season = item.details?.seasons[0]?.number ?? 1
        patch.current_episode = 0
      }
      if (!items.some(i => i.is_public_current)) patch.is_public_current = true
    }
    if (next === 'watched') {
      if (!item.started_on) patch.started_on = today
      patch.finished_on = today
      const last = isEpisodic(item) ? finalEpisode(item) : null
      if (last) {
        patch.current_season = last.season
        patch.current_episode = last.episode
      }
    }
    if (next !== 'watching' && next !== 'paused' && item.is_public_current) patch.is_public_current = false
    return patch
  }, [items])

  async function addFromSearch(result: WatchSearchResult, initialStatus: WatchStatus) {
    if (!userId) return
    try {
      let item = await insertFromSearch(supabase, userId, result)
      if (initialStatus !== 'watchlist') item = await updateWatchItem(supabase, item.id, statusPatch(item, initialStatus))
      setItems(prev => [item, ...prev])
      setStatus(initialStatus)
      setToast(`Added ${item.title}`)
      void hydrateDetails(item, true)
    } catch (err) {
      if (err instanceof DuplicateWatchItemError) {
        const existing = items.find(i => i.tmdb_id === result.tmdbId && i.tmdb_type === result.type)
        setToast(`${result.title} is already on your list`)
        if (existing) setDetailId(existing.id)
        return
      }
      throw err
    }
  }

  async function addTitleOnly(title: string) {
    if (!userId) return
    const item = await insertTitleOnly(supabase, userId, title)
    setItems(prev => [item, ...prev])
    setStatus('watchlist')
    setToast(`Added ${item.title} (title only)`)
  }

  function openDetail(item: WatchItem) {
    setDetailId(item.id)
    const stale = !item.details_refreshed_at || Date.now() - new Date(item.details_refreshed_at).getTime() > STALE_MS
    if (item.tmdb_id && stale && !refreshing.has(item.id)) void hydrateDetails(item, !item.details)
  }

  async function logNextEpisode(item: WatchItem) {
    const progress = progressSummary(item)
    if (progress?.atEnd) {
      replace(await updateWatchItem(supabase, item.id, statusPatch(item, 'watched')))
      setToast(`Finished ${item.title}`)
      return
    }
    const next = nextEpisode(item)
    const patch: Partial<WatchItem> = { current_season: next.season, current_episode: next.episode }
    const moveToWatching = item.status === 'watchlist' || item.status === 'paused'
    replace(await updateWatchItem(supabase, item.id, moveToWatching ? { ...statusPatch(item, 'watching'), ...patch } : patch))
  }

  const actions: DetailActions = {
    setStatus: (item, next) => run(async () => {
      replace(await updateWatchItem(supabase, item.id, statusPatch(item, next)))
    }),
    update: (item, patch) => run(async () => {
      replace(await updateWatchItem(supabase, item.id, patch))
    }),
    nextEpisode: item => run(() => logNextEpisode(item)),
    toggleFeatured: item => run(async () => {
      if (!userId) return
      const updated = await setFeatured(supabase, userId, item.id, !item.is_public_current)
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : { ...i, is_public_current: false })))
      setToast(updated.is_public_current ? `${item.title} is now on your public site` : 'Removed from your public site')
    }),
    relink: (item, result) => run(async () => {
      const linked = await updateWatchItem(supabase, item.id, {
        tmdb_id: result.tmdbId,
        tmdb_type: result.type,
        kind: result.suggestedKind,
        title: result.title,
        year: result.year,
        poster_url: result.posterUrl,
        backdrop_url: result.backdropUrl,
      })
      replace(linked)
      await hydrateDetails(linked, true)
    }),
    refresh: item => run(() => hydrateDetails(item, false)),
    remove: item => run(async () => {
      await deleteWatchItem(supabase, item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      setDetailId(null)
      setToast(`Removed ${item.title}`)
    }),
  }

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map(s => [s, 0])) as Record<WatchStatus, number>
    items.forEach(i => { counts[i.status]++ })
    return counts
  }, [items])

  const inStatus = useMemo(() => items.filter(i => i.status === status), [items, status])
  const kindCounts = useMemo(() => {
    const counts = Object.fromEntries(KINDS.map(k => [k, 0])) as Record<WatchKind, number>
    inStatus.forEach(i => { counts[i.kind]++ })
    return counts
  }, [inStatus])
  const visible = useMemo(
    () => sortItems(kind === 'all' ? inStatus : inStatus.filter(i => i.kind === kind), sort),
    [inStatus, kind, sort]
  )

  const detailItem = detailId ? items.find(i => i.id === detailId) ?? null : null

  return (
    <IvenModule
      index={16}
      title="Watchlist"
      right={
        <button
          onClick={() => setPickOpen(true)}
          disabled={!statusCounts.watchlist}
          className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] uppercase tracking-[1.5px] px-3 py-2 rounded-lg disabled:opacity-50"
          style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}
        >
          <Shuffle size={13} /> Pick for me
        </button>
      }
    >
      <div className="max-w-[1180px] w-full flex flex-col gap-6">
        <div className="max-w-[640px]">
          <TitleSearch
            placeholder="Add a movie, show, anime or Nollywood film…"
            autoFocus
            showWatchingAction
            onPick={(result, s) => run(() => addFromSearch(result, s))}
            onAddTitleOnly={title => run(() => addTitleOnly(title))}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2" style={{ borderBottom: '1px solid var(--iven-grid)' }}>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className="font-mono text-[11px] uppercase tracking-[2px] pb-2.5 -mb-px transition-colors"
                style={{
                  color: status === s ? 'var(--iven-text)' : 'var(--iven-muted)',
                  borderBottom: `2px solid ${status === s ? 'var(--iven-accent)' : 'transparent'}`,
                }}
              >
                {STATUS_LABELS[s]} <span style={{ color: 'var(--iven-accent)' }}>{statusCounts[s]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Chip active={kind === 'all'} onClick={() => setKind('all')} count={inStatus.length}>All</Chip>
            {KINDS.map(k => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)} count={kindCounts[k]}>{KIND_LABELS[k]}</Chip>
            ))}
            <div className="flex-1" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="font-mono text-[11px] uppercase tracking-[1px] px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
            >
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-xl animate-pulse" style={{ background: 'var(--iven-surface)', aspectRatio: '2 / 3' }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div
            className="rounded-xl py-14 px-6 flex flex-col items-center text-center gap-3"
            style={{ border: '1px dashed var(--iven-grid)' }}
          >
            <Clapperboard size={26} style={{ color: 'var(--iven-accent)' }} />
            <p className="font-inter text-[14px] max-w-sm" style={{ color: 'var(--iven-muted)' }}>
              {kind === 'all' ? EMPTY_COPY[status] : `No ${KIND_LABELS[kind].toLowerCase()} titles in ${STATUS_LABELS[status]}.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-7">
            {visible.map(item => (
              <PosterCard
                key={item.id}
                item={item}
                onOpen={() => openDetail(item)}
                onNextEpisode={() => run(() => logNextEpisode(item))}
              />
            ))}
          </div>
        )}

        <footer className="pt-6 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-inter text-[11px]" style={{ borderTop: '1px solid var(--iven-grid)', color: 'var(--iven-muted)' }}>
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="font-mono font-semibold tracking-[1px]" style={{ color: 'var(--iven-accent)' }}>
            TMDB
          </a>
          <span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
          <span>Anime data from MyAnimeList via Jikan and AniList. Streaming data by JustWatch.</span>
        </footer>
      </div>

      <DetailDialog
        item={detailItem}
        dark={dark}
        refreshing={detailItem ? refreshing.has(detailItem.id) : false}
        actions={actions}
        onClose={() => setDetailId(null)}
      />

      <PickForMe
        open={pickOpen}
        dark={dark}
        items={items}
        onOpenChange={setPickOpen}
        onShowDetails={item => { setPickOpen(false); openDetail(item) }}
        onStart={item => run(async () => {
          replace(await updateWatchItem(supabase, item.id, statusPatch(item, 'watching')))
          setPickOpen(false)
          setStatus('watching')
          setToast(`Started ${item.title}`)
        })}
      />

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] font-inter text-[13px] px-4 py-2.5 rounded-xl shadow-xl"
          style={{ background: 'var(--iven-text)', color: 'var(--iven-bg)' }}
          role="status"
        >
          {toast}
        </div>
      )}
    </IvenModule>
  )
}
