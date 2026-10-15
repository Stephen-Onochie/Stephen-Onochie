'use client'

import { Check, Globe, Plus, Star } from 'lucide-react'
import { KIND_LABELS, type WatchItem } from '@/types/watchlist'
import { progressSummary } from '@/lib/watchlist/progress'
import { Poster, ProgressBar } from './shared'

export default function PosterCard({
  item,
  onOpen,
  onNextEpisode,
}: {
  item: WatchItem
  onOpen: () => void
  onNextEpisode: () => void
}) {
  const progress = progressSummary(item)
  const showEpisodeAction = item.status === 'watching' && progress != null

  return (
    <div className="group flex flex-col gap-2 min-w-0">
      <button
        onClick={onOpen}
        className="relative block w-full rounded-xl overflow-hidden text-left transition-transform group-hover:-translate-y-0.5"
        style={{ border: '1px solid var(--iven-grid)' }}
      >
        <Poster url={item.poster_url} title={item.title} />
        <div className="absolute top-2 left-2 flex gap-1">
          <span
            className="font-mono text-[9px] uppercase tracking-[1.5px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(20,16,12,0.78)', color: '#E2C97E' }}
          >
            {KIND_LABELS[item.kind]}
          </span>
          {item.is_public_current && (
            <span className="flex items-center px-1 rounded" style={{ background: 'rgba(20,16,12,0.78)', color: '#E2C97E' }} title="Featured on your public site">
              <Globe size={10} />
            </span>
          )}
        </div>
        {item.rating != null && (
          <span
            className="absolute top-2 right-2 flex items-center gap-0.5 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: '#C9A84C', color: '#2C1F0E' }}
          >
            <Star size={9} fill="currentColor" /> {item.rating}
          </span>
        )}
      </button>

      <div className="min-w-0 px-0.5">
        <button onClick={onOpen} className="block text-left w-full">
          <div className="font-inter text-[13px] font-semibold leading-snug line-clamp-2" style={{ color: 'var(--iven-text)' }}>
            {item.title}
          </div>
        </button>
        <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--iven-muted)' }}>
          {[item.year, item.details?.genres[0]].filter(Boolean).join(' · ') || '\u00A0'}
        </div>

        {progress && (item.status === 'watching' || item.status === 'paused') && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              {progress.pct != null && <ProgressBar pct={progress.pct} />}
              <div className="font-mono text-[10px] mt-1" style={{ color: 'var(--iven-muted)' }}>
                {progress.label}
                {progress.total ? ` · ${progress.watched}/${progress.total}` : ''}
              </div>
            </div>
            {showEpisodeAction && (
              <button
                onClick={onNextEpisode}
                className="flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-1 rounded-md flex-shrink-0"
                style={{ color: 'var(--iven-text)', border: '1px solid var(--iven-grid)' }}
                title={progress.atEnd ? 'Finished: mark as watched' : 'Log the next episode'}
              >
                {progress.atEnd ? <Check size={11} /> : <><Plus size={10} />EP</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
