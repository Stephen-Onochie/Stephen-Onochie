'use client'

import type { NativeClockStockQuote } from '@/types/native-clock'

interface StockTickerProps {
  quotes: NativeClockStockQuote[]
  loading: boolean
  error: string | null
}

function formatPrice(price: number): string {
  return price >= 1000 ? price.toFixed(0) : price.toFixed(2)
}

function buildTickerText(quotes: NativeClockStockQuote[]): string {
  if (quotes.length === 0) return ''
  return (
    quotes
      .map((q) => {
        const sign = q.changePercent >= 0 ? '+' : ''
        return `${q.symbol} $${formatPrice(q.price)} ${sign}${q.changePercent.toFixed(2)}%`
      })
      .join(' · ') + ' · '
  )
}

export default function StockTicker({ quotes, loading, error }: StockTickerProps) {
  const ticker = buildTickerText(quotes)

  return (
    <section
      className="border-b"
      style={{ borderColor: 'var(--nc-grid)' }}
      aria-label="Stock quotes"
    >
      <div className="flex items-stretch min-h-[2.75rem] md:min-h-[3rem]">
        <div
          className="shrink-0 border-r px-4 md:px-6 flex items-center"
          style={{ borderColor: 'var(--nc-grid)' }}
        >
          <span
            className="font-mono text-[10px] md:text-xs uppercase tracking-[0.25em]"
            style={{ color: 'var(--nc-accent)' }}
          >
            {loading ? 'Markets' : 'Stocks'}
          </span>
        </div>

        <div className="relative flex-1 overflow-hidden flex items-center min-w-0">
          {loading && (
            <p
              className="px-4 font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse"
              style={{ color: 'var(--nc-muted)' }}
            >
              Loading quotes…
            </p>
          )}

          {!loading && error && (
            <p className="px-4 font-inter text-xs" style={{ color: 'var(--nc-muted)' }}>
              {error}
            </p>
          )}

          {!loading && !error && ticker && (
            <div
              className="portfolio-ticker flex whitespace-nowrap text-[10px] md:text-xs uppercase tracking-[0.15em] font-mono tabular-nums"
              style={{ color: 'var(--nc-muted)' }}
              aria-live="polite"
            >
              <span>{ticker}</span>
              <span aria-hidden="true">{ticker}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
