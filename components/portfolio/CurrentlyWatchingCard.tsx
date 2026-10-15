'use client'

import { useEffect, useState } from 'react'
import { KIND_LABELS, type PublicCurrentWatch } from '@/types/watchlist'
import { usePublicSettings } from './PublicSettingsProvider'

export default function CurrentlyWatchingCard() {
  const { showCurrentlyWatching } = usePublicSettings()
  const [watch, setWatch] = useState<PublicCurrentWatch | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/public/current-watch')
      .then(r => r.json())
      .then(data => setWatch(data.watch ?? null))
      .catch(() => setWatch(null))
      .finally(() => setLoaded(true))
  }, [])

  // Hidden by the owner, or nothing featured from the Watchlist yet.
  if (!showCurrentlyWatching || !loaded || !watch) return null

  const meta = [KIND_LABELS[watch.kind], watch.year, ...watch.genres].filter(Boolean).join(' · ')

  return (
    <section className="border-b border-grid">
      <div className="px-6 md:px-8 py-6 md:py-8">
        <div className="flex items-center justify-between border-b border-grid pb-3 mb-6">
          <h2 className="font-display text-2xl md:text-3xl uppercase tracking-wide text-textPrimary">
            Currently Watching
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            now
          </span>
        </div>

        <div className="flex items-stretch gap-5 md:gap-6">
          <div className="w-24 md:w-28 shrink-0 border border-grid bg-surface overflow-hidden flex items-center justify-center aspect-[2/3]">
            {watch.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={watch.posterUrl} alt={watch.title} className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted px-2 text-center py-8">
                no poster
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="font-display text-xl md:text-2xl uppercase tracking-wide text-textPrimary leading-tight">
              {watch.title}
            </p>
            <p className="font-mono text-xs text-textMuted mt-1.5">
              <span className="text-gold mr-2">&gt;</span>
              {meta}
            </p>

            {watch.progressLabel && (
              <div className="mt-5 max-w-sm">
                {watch.progressPct != null && (
                  <div className="h-1.5 bg-surface border border-grid">
                    <div className="h-full bg-gold" style={{ width: `${watch.progressPct}%` }} />
                  </div>
                )}
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted mt-2">
                  {watch.progressLabel}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
