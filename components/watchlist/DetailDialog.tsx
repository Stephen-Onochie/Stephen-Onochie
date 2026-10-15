'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, ExternalLink, Globe, Loader2, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import {
  KIND_LABELS,
  STATUS_LABELS,
  type WatchItem,
  type WatchKind,
  type WatchProvider,
  type WatchSearchResult,
  type WatchStatus,
} from '@/types/watchlist'
import { isEpisodic, progressSummary } from '@/lib/watchlist/progress'
import TitleSearch from './TitleSearch'
import { formatRuntime, Poster, ProgressBar, SectionLabel } from './shared'

const STATUSES: WatchStatus[] = ['watchlist', 'watching', 'paused', 'watched', 'dropped']
const KINDS: WatchKind[] = ['movie', 'tv', 'anime', 'nollywood']

export interface DetailActions {
  setStatus: (item: WatchItem, status: WatchStatus) => Promise<void>
  update: (item: WatchItem, patch: Partial<WatchItem>) => Promise<void>
  nextEpisode: (item: WatchItem) => Promise<void>
  toggleFeatured: (item: WatchItem) => Promise<void>
  relink: (item: WatchItem, result: WatchSearchResult) => Promise<void>
  refresh: (item: WatchItem) => Promise<void>
  remove: (item: WatchItem) => Promise<void>
}

export default function DetailDialog({
  item,
  dark,
  refreshing,
  actions,
  onClose,
}: {
  item: WatchItem | null
  dark: boolean
  refreshing: boolean
  actions: DetailActions
  onClose: () => void
}) {
  const [notes, setNotes] = useState('')
  const [playing, setPlaying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setNotes(item?.notes ?? '')
    setPlaying(false)
    setConfirmDelete(false)
    // Reset only when switching items; live updates to the same item keep the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])

  if (!item) return null
  const d = item.details
  const progress = progressSummary(item)
  const episodic = isEpisodic(item)
  const runtime = formatRuntime(d?.runtimeMinutes)
  const meta = [
    item.year,
    d?.type === 'tv' && d.seasons.length ? `${d.seasons.length} season${d.seasons.length === 1 ? '' : 's'}` : null,
    runtime ? (d?.type === 'tv' ? `${runtime} / ep` : runtime) : null,
    d?.showStatus && d.type === 'tv' ? d.showStatus : null,
  ].filter(Boolean)

  function saveNotes() {
    if (!item) return
    const next = notes.trim() || null
    if (next !== (item.notes ?? null)) actions.update(item, { notes: next })
  }

  return (
    <Dialog.Root open onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          data-iven-theme={dark ? 'dark' : 'light'}
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[min(94vw,920px)] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl outline-none"
          style={{ background: 'var(--iven-bg)', color: 'var(--iven-text)', border: '1px solid var(--iven-grid)' }}
        >
          {/* Backdrop header */}
          <div className="relative h-[200px] sm:h-[260px] overflow-hidden rounded-t-2xl" style={{ background: 'var(--iven-surface)' }}>
            {item.backdrop_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.backdrop_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 30%, var(--iven-bg) 100%)' }} />
            <Dialog.Close asChild>
              <button
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(20,16,12,0.6)', color: '#F5F0E8' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-5 sm:px-8 pb-8 -mt-24 sm:-mt-28 relative">
            {/* Title block */}
            <div className="flex gap-5 items-end">
              <Poster
                url={item.poster_url}
                title={item.title}
                className="w-[104px] sm:w-[140px] flex-shrink-0 rounded-xl shadow-xl"
              />
              <div className="min-w-0 pb-1">
                <div className="font-mono text-[10px] uppercase tracking-[2.5px] mb-1.5" style={{ color: 'var(--iven-accent)' }}>
                  {KIND_LABELS[item.kind]}
                </div>
                <Dialog.Title className="font-playfair font-bold text-[26px] sm:text-[32px] leading-tight m-0">
                  {item.title}
                </Dialog.Title>
                {d?.originalTitle && (
                  <div className="font-inter text-[13px] mt-0.5" style={{ color: 'var(--iven-muted)' }}>{d.originalTitle}</div>
                )}
                {meta.length > 0 && (
                  <div className="font-mono text-[12px] mt-1.5" style={{ color: 'var(--iven-muted)' }}>{meta.join(' · ')}</div>
                )}
              </div>
            </div>

            {/* Status + controls */}
            <div className="flex flex-wrap items-center gap-2 mt-6">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => actions.setStatus(item, s)}
                  className="font-mono text-[11px] uppercase tracking-[1.5px] px-3 py-1.5 rounded-full transition-colors"
                  style={
                    item.status === s
                      ? { background: 'var(--iven-accent)', color: '#2C1F0E', border: '1px solid var(--iven-accent)' }
                      : { color: 'var(--iven-muted)', border: '1px solid var(--iven-grid)' }
                  }
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => actions.toggleFeatured(item)}
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] px-3 py-1.5 rounded-full"
                style={
                  item.is_public_current
                    ? { background: 'var(--iven-text)', color: 'var(--iven-bg)', border: '1px solid var(--iven-text)' }
                    : { color: 'var(--iven-muted)', border: '1px solid var(--iven-grid)' }
                }
                title="Show as Currently Watching on stephenonochie.com"
              >
                <Globe size={12} /> {item.is_public_current ? 'On public site' : 'Feature publicly'}
              </button>
            </div>

            {/* Title-only items can be matched to TMDB later */}
            {!item.tmdb_id && (
              <div className="mt-6 rounded-xl p-4" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}>
                <SectionLabel>Find a match</SectionLabel>
                <p className="font-inter text-[13px] mb-3" style={{ color: 'var(--iven-muted)' }}>
                  This title isn&apos;t linked to TMDB yet, so it has no poster or details. Search again to link it.
                </p>
                <TitleSearch
                  placeholder="Search TMDB…"
                  initialQuery={item.title}
                  onPick={result => actions.relink(item, result)}
                />
              </div>
            )}

            <div className="grid md:grid-cols-[1fr_260px] gap-8 mt-7">
              {/* Main column */}
              <div className="min-w-0 space-y-7">
                {(d?.tagline || d?.overview) && (
                  <div>
                    {d?.tagline && (
                      <p className="font-playfair italic text-[16px] mb-2" style={{ color: 'var(--iven-accent)' }}>{d.tagline}</p>
                    )}
                    {d?.overview && (
                      <p className="font-inter text-[14px] leading-relaxed" style={{ color: 'var(--iven-text)' }}>{d.overview}</p>
                    )}
                  </div>
                )}

                {d?.genres.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {d.genres.map(g => (
                      <span
                        key={g}
                        className="font-mono text-[10px] uppercase tracking-[1.5px] px-2 py-1 rounded"
                        style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-muted)' }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                ) : null}

                {d?.trailerKey && (
                  <div>
                    <SectionLabel>Trailer</SectionLabel>
                    {playing ? (
                      <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 9', background: '#000' }}>
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${d.trailerKey}?autoplay=1&rel=0`}
                          title={`${item.title} trailer`}
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setPlaying(true)}
                        className="relative w-full rounded-xl overflow-hidden group"
                        style={{ aspectRatio: '16 / 9', background: '#000' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://i.ytimg.com/vi/${d.trailerKey}/hqdefault.jpg`}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <span
                          className="absolute inset-0 m-auto w-14 h-14 rounded-full flex items-center justify-center"
                          style={{ background: '#C9A84C', color: '#2C1F0E' }}
                        >
                          <Play size={22} fill="currentColor" />
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {d?.cast.length ? (
                  <div>
                    <SectionLabel>Cast</SectionLabel>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                      {d.cast.map(c => (
                        <div key={`${c.name}-${c.character}`} className="w-[84px] flex-shrink-0">
                          <div
                            className="w-[84px] h-[110px] rounded-lg overflow-hidden flex items-center justify-center"
                            style={{ background: 'var(--iven-surface)' }}
                          >
                            {c.profileUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.profileUrl} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-playfair text-[22px] font-bold" style={{ color: 'var(--iven-muted)' }}>
                                {c.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="font-inter text-[12px] font-medium leading-tight mt-1.5 line-clamp-2">{c.name}</div>
                          {c.character && (
                            <div className="font-inter text-[11px] leading-tight mt-0.5 line-clamp-2" style={{ color: 'var(--iven-muted)' }}>
                              {c.character}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(d?.creators.length || d?.anime?.studios.length) ? (
                  <div className="grid grid-cols-2 gap-4">
                    {d?.creators.length ? (
                      <div>
                        <SectionLabel>{d.creatorLabel}</SectionLabel>
                        <div className="font-inter text-[13px]">{d.creators.join(', ')}</div>
                      </div>
                    ) : null}
                    {d?.anime?.studios.length ? (
                      <div>
                        <SectionLabel>Studio</SectionLabel>
                        <div className="font-inter text-[13px]">{d.anime.studios.join(', ')}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {d?.providers && <Providers providers={d.providers} />}
              </div>

              {/* Side column: your tracking */}
              <div className="space-y-6">
                <div>
                  <SectionLabel>Your rating</SectionLabel>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        onClick={() => actions.update(item, { rating: item.rating === n ? null : n })}
                        className="font-mono text-[12px] py-1.5 rounded-md transition-colors"
                        style={
                          item.rating != null && n <= item.rating
                            ? { background: 'var(--iven-accent)', color: '#2C1F0E' }
                            : { border: '1px solid var(--iven-grid)', color: 'var(--iven-muted)' }
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {episodic && (
                  <EpisodeProgress item={item} actions={actions} pct={progress?.pct ?? null} atEnd={progress?.atEnd ?? false} />
                )}

                <div>
                  <SectionLabel>Notes</SectionLabel>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    onBlur={saveNotes}
                    rows={4}
                    placeholder="Who recommended it, thoughts, where you left off…"
                    className="w-full font-inter text-[13px] px-3 py-2 rounded-lg outline-none resize-y"
                    style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
                  />
                </div>

                <Scores item={item} />

                <div>
                  <SectionLabel>Type</SectionLabel>
                  <select
                    value={item.kind}
                    onChange={e => actions.update(item, { kind: e.target.value as WatchKind })}
                    className="w-full font-inter text-[13px] px-3 py-2 rounded-lg outline-none"
                    style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
                  >
                    {KINDS.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                  </select>
                </div>

                <div className="font-mono text-[11px] space-y-1" style={{ color: 'var(--iven-muted)' }}>
                  <div>Added {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  {item.started_on && <div>Started {formatDateOnly(item.started_on)}</div>}
                  {item.finished_on && <div>Finished {formatDateOnly(item.finished_on)}</div>}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {item.tmdb_id && (
                    <button
                      onClick={() => actions.refresh(item)}
                      disabled={refreshing}
                      className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px] disabled:opacity-60"
                      style={{ color: 'var(--iven-muted)' }}
                    >
                      <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing' : 'Refresh details'}
                    </button>
                  )}
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => actions.remove(item)}
                        className="font-mono text-[11px] uppercase tracking-[1px] px-2.5 py-1 rounded-md"
                        style={{ background: '#B4533A', color: '#fff' }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="font-mono text-[11px] uppercase tracking-[1px]"
                        style={{ color: 'var(--iven-muted)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px] hover:text-red-600 transition-colors"
                      style={{ color: 'var(--iven-muted)' }}
                    >
                      <Trash2 size={12} /> Remove from list
                    </button>
                  )}
                </div>
              </div>
            </div>

            {refreshing && !d && (
              <div className="flex items-center gap-2 mt-6 font-inter text-[13px]" style={{ color: 'var(--iven-muted)' }}>
                <Loader2 size={14} className="animate-spin" /> Loading details…
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function formatDateOnly(dateStr: string) {
  const [y, m, day] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function EpisodeProgress({
  item,
  actions,
  pct,
  atEnd,
}: {
  item: WatchItem
  actions: DetailActions
  pct: number | null
  atEnd: boolean
}) {
  const seasons = item.details?.seasons ?? []
  const season = item.current_season ?? seasons[0]?.number ?? 1
  const episode = item.current_episode ?? 0
  const seasonInfo = seasons.find(s => s.number === season)

  function setEpisode(next: number) {
    const max = seasonInfo?.episodeCount ?? Infinity
    actions.update(item, { current_season: season, current_episode: Math.max(0, Math.min(next, max)) })
  }

  return (
    <div>
      <SectionLabel>Progress</SectionLabel>
      <div className="flex items-center gap-2">
        {seasons.length > 0 ? (
          <select
            value={season}
            onChange={e => actions.update(item, { current_season: Number(e.target.value), current_episode: 0 })}
            className="font-mono text-[12px] px-2 py-1.5 rounded-lg outline-none"
            style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
          >
            {seasons.map(s => <option key={s.number} value={s.number}>S{s.number}</option>)}
          </select>
        ) : (
          <span className="font-mono text-[12px]">S{season}</span>
        )}
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--iven-grid)' }}>
          <button onClick={() => setEpisode(episode - 1)} className="px-2 py-1.5 font-mono text-[12px]" style={{ color: 'var(--iven-muted)' }}>−</button>
          <span className="px-2 font-mono text-[12px] tabular-nums">
            E{episode}{seasonInfo ? <span style={{ color: 'var(--iven-muted)' }}>/{seasonInfo.episodeCount}</span> : null}
          </span>
          <button onClick={() => setEpisode(episode + 1)} className="px-2 py-1.5 font-mono text-[12px]" style={{ color: 'var(--iven-muted)' }}>+</button>
        </div>
      </div>
      {pct != null && <div className="mt-3"><ProgressBar pct={pct} /></div>}
      <button
        onClick={() => actions.nextEpisode(item)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] py-2 rounded-lg"
        style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}
      >
        {atEnd ? <><Check size={13} /> Finished: mark watched</> : <><Plus size={13} /> Watched next episode</>}
      </button>
    </div>
  )
}

function Scores({ item }: { item: WatchItem }) {
  const d = item.details
  const anime = d?.anime
  const links = [
    item.tmdb_id && item.tmdb_type ? { label: 'TMDB', href: `https://www.themoviedb.org/${item.tmdb_type}/${item.tmdb_id}` } : null,
    d?.imdbId ? { label: 'IMDb', href: `https://www.imdb.com/title/${d.imdbId}` } : null,
    anime?.malUrl ? { label: 'MyAnimeList', href: anime.malUrl } : null,
    anime && anime.source === 'anilist' ? { label: 'AniList', href: anime.url } : null,
  ].filter((l): l is { label: string; href: string } => l != null)

  if (!d?.tmdbScore && !anime?.score && !links.length) return null

  return (
    <div>
      <SectionLabel>Scores</SectionLabel>
      <div className="flex gap-4">
        {d?.tmdbScore != null && (
          <div>
            <div className="font-mono text-[22px] font-semibold leading-none">{d.tmdbScore.toFixed(1)}</div>
            <div className="font-mono text-[10px] uppercase tracking-[1px] mt-1" style={{ color: 'var(--iven-muted)' }}>TMDB</div>
          </div>
        )}
        {anime?.score != null && (
          <div>
            <div className="font-mono text-[22px] font-semibold leading-none">{anime.score.toFixed(1)}</div>
            <div className="font-mono text-[10px] uppercase tracking-[1px] mt-1" style={{ color: 'var(--iven-muted)' }}>
              {anime.source === 'jikan' ? 'MAL' : 'AniList'}
            </div>
          </div>
        )}
        {anime?.episodes != null && (
          <div>
            <div className="font-mono text-[22px] font-semibold leading-none">{anime.episodes}</div>
            <div className="font-mono text-[10px] uppercase tracking-[1px] mt-1" style={{ color: 'var(--iven-muted)' }}>Episodes</div>
          </div>
        )}
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-[11px] hover:underline"
              style={{ color: 'var(--iven-accent)' }}
            >
              {l.label} <ExternalLink size={10} />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function Providers({ providers }: { providers: NonNullable<NonNullable<WatchItem['details']>['providers']> }) {
  const groups: { label: string; list: WatchProvider[] }[] = [
    { label: 'Stream', list: providers.stream },
    { label: 'Free', list: providers.free },
    { label: 'Rent', list: providers.rent },
    { label: 'Buy', list: providers.buy },
  ].filter(g => g.list.length)

  return (
    <div>
      <SectionLabel>Where to watch · US</SectionLabel>
      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.label} className="flex items-start gap-3">
            <div className="w-12 flex-shrink-0 font-mono text-[10px] uppercase tracking-[1px] pt-2" style={{ color: 'var(--iven-muted)' }}>
              {g.label}
            </div>
            <div className="flex flex-wrap gap-2">
              {g.list.map(p => (
                <a
                  key={p.name}
                  href={providers.link ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.name}
                  className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}
                >
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logoUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-mono text-[9px]">{p.name.slice(0, 3)}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="font-inter text-[11px] mt-3" style={{ color: 'var(--iven-muted)' }}>
        Streaming availability by JustWatch.
      </div>
    </div>
  )
}
