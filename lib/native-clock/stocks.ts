import type { NativeClockStockQuote } from '@/types/native-clock'

interface YahooQuote {
  symbol?: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: YahooQuote[]
    error?: { description?: string } | null
  }
}

export function normalizeStockSymbols(symbols: string[]): string[] {
  return symbols
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(s))
    .slice(0, 12)
}

export async function fetchStockQuotes(
  symbols: string[]
): Promise<NativeClockStockQuote[]> {
  const normalized = normalizeStockSymbols(symbols)
  if (normalized.length === 0) {
    return []
  }

  const url = new URL('https://query1.finance.yahoo.com/v7/finance/quote')
  url.searchParams.set('symbols', normalized.join(','))

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Stephen-Onochie-NativeClock/1.0' },
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error('Stock quote service unavailable')
  }

  const data = (await response.json()) as YahooQuoteResponse
  const results = data.quoteResponse?.result ?? []

  return results
    .filter((q) => q.symbol && q.regularMarketPrice != null)
    .map((q) => ({
      symbol: q.symbol!,
      price: q.regularMarketPrice!,
      changePercent: q.regularMarketChangePercent ?? 0,
    }))
}
