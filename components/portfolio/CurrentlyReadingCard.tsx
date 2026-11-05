'use client'

import { useEffect, useState } from 'react'
import type { PublicCurrentBook } from '@/types/reading'
import { usePublicSettings } from './PublicSettingsProvider'
import { BenchCard } from './BenchCard'

export default function CurrentlyReadingCard() {
  const { showCurrentlyReading } = usePublicSettings()
  const [book, setBook] = useState<PublicCurrentBook | null>(null)

  useEffect(() => {
    fetch('/api/public/current-book')
      .then(r => r.json())
      .then(data => setBook(data.book ?? null))
      .catch(() => setBook(null))
  }, [])

  // Hidden by the owner, or nothing flagged as a public book yet.
  if (!showCurrentlyReading || !book) return null

  const pct = book.totalPages ? Math.min(Math.round((book.currentPage / book.totalPages) * 100), 100) : null

  return (
    <BenchCard
      kicker="Currently reading"
      title={book.title}
      meta={book.author}
      imageUrl={book.coverUrl}
      progressPct={pct}
      progressLabel={pct != null ? `Page ${book.currentPage} of ${book.totalPages} · ${pct}%` : null}
    />
  )
}
