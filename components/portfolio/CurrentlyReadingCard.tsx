'use client'

import { useEffect, useState } from 'react'
import type { PublicCurrentBook } from '@/types/reading'
import { usePublicSettings } from './PublicSettingsProvider'

export default function CurrentlyReadingCard() {
  const { showCurrentlyReading } = usePublicSettings()
  const [book, setBook] = useState<PublicCurrentBook | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/public/current-book')
      .then(r => r.json())
      .then(data => setBook(data.book ?? null))
      .catch(() => setBook(null))
      .finally(() => setLoaded(true))
  }, [])

  // Hidden by the owner, or nothing flagged as a public book yet.
  if (!showCurrentlyReading || !loaded || !book) return null

  const pct = book.totalPages
    ? Math.min(Math.round((book.currentPage / book.totalPages) * 100), 100)
    : null

  return (
    <section className="border-b border-grid">
      <div className="px-6 md:px-8 py-6 md:py-8">
        <div className="flex items-center justify-between border-b border-grid pb-3 mb-6">
          <h2 className="font-display text-2xl md:text-3xl uppercase tracking-wide text-textPrimary">
            Currently Reading
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            now
          </span>
        </div>

        <div className="flex items-stretch gap-5 md:gap-6">
          {/* Cover */}
          <div className="w-24 md:w-28 shrink-0 border border-grid bg-surface overflow-hidden flex items-center justify-center">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted px-2 text-center py-8">
                no cover
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="font-display text-xl md:text-2xl uppercase tracking-wide text-textPrimary leading-tight">
              {book.title}
            </p>
            {book.author && (
              <p className="font-mono text-xs text-textMuted mt-1.5">
                <span className="text-gold mr-2">&gt;</span>
                {book.author}
              </p>
            )}

            {pct != null && (
              <div className="mt-5 max-w-sm">
                <div className="h-1.5 bg-surface border border-grid">
                  <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted mt-2">
                  Page {book.currentPage} of {book.totalPages} · {pct}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
