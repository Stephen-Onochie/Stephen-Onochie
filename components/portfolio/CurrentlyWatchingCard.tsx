'use client'

import { useEffect, useState } from 'react'
import { KIND_LABELS, type PublicCurrentWatch } from '@/types/watchlist'
import { usePublicSettings } from './PublicSettingsProvider'
import { BenchCard } from './BenchCard'

export default function CurrentlyWatchingCard() {
  const { showCurrentlyWatching } = usePublicSettings()
  const [watch, setWatch] = useState<PublicCurrentWatch | null>(null)

  useEffect(() => {
    fetch('/api/public/current-watch')
      .then(r => r.json())
      .then(data => setWatch(data.watch ?? null))
      .catch(() => setWatch(null))
  }, [])

  // Hidden by the owner, or nothing featured from the Watchlist yet.
  if (!showCurrentlyWatching || !watch) return null

  return (
    <BenchCard
      kicker="Currently watching"
      title={watch.title}
      meta={[KIND_LABELS[watch.kind], watch.year, ...watch.genres].filter(Boolean).join(' · ')}
      imageUrl={watch.posterUrl}
      progressPct={watch.progressPct}
      progressLabel={watch.progressLabel}
    />
  )
}
