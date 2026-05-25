'use client'

import { tickerScrollStyle } from '@/lib/native-clock/ticker'
import type { NativeClockHeadline } from '@/types/native-clock'

interface NewsHeadlinesProps {
  headlines: NativeClockHeadline[]
  source: string
  loading: boolean
  error: string | null
  scrollSec: number
}

function buildTickerText(headlines: NativeClockHeadline[]): string {
  if (headlines.length === 0) return ''
  return headlines.map((h) => h.title).join(' · ') + ' · '
}

export default function NewsHeadlines({
  headlines,
  source,
  loading,
  error,
  scrollSec,
}: NewsHeadlinesProps) {
  const ticker = buildTickerText(headlines)

  return (
    <footer
      className="border-t"
      style={{ borderColor: 'var(--nc-grid)', backgroundColor: 'var(--nc-bg)' }}
    >
      <div className="flex items-stretch min-h-[3rem] md:min-h-[3.25rem]">
        <div
          className="shrink-0 border-r px-4 md:px-6 flex items-center"
          style={{ borderColor: 'var(--nc-grid)' }}
        >
          <span
            className="font-mono text-[10px] md:text-xs uppercase tracking-[0.25em]"
            style={{ color: 'var(--nc-accent)' }}
          >
            {loading ? 'News' : source}
          </span>
        </div>

        <div className="relative flex-1 overflow-hidden flex items-center min-w-0">
          {loading && (
            <p
              className="px-4 font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse"
              style={{ color: 'var(--nc-muted)' }}
            >
              Loading headlines…
            </p>
          )}

          {!loading && error && (
            <p className="px-4 font-inter text-xs" style={{ color: 'var(--nc-muted)' }}>
              {error}
            </p>
          )}

          {!loading && !error && ticker && (
            <div
              className="portfolio-ticker flex whitespace-nowrap text-[10px] md:text-xs uppercase tracking-[0.2em]"
              style={{ color: 'var(--nc-muted)', ...tickerScrollStyle(scrollSec) }}
              aria-live="polite"
            >
              <span>{ticker}</span>
              <span aria-hidden="true">{ticker}</span>
            </div>
          )}
        </div>
      </div>

      {!loading && !error && headlines.length > 0 && (
        <ul className="sr-only">
          {headlines.map((item) => (
            <li key={item.link + item.title}>
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </footer>
  )
}
