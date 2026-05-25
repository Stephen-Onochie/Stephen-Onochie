import type { NativeClockStockQuote } from '@/types/native-clock'

const YAHOO_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface YahooSparkEntry {
  symbol?: string
  close?: number[]
  chartPreviousClose?: number
}

interface YahooSparkResponse {
  [symbol: string]: YahooSparkEntry
}

export function normalizeStockSymbols(symbols: string[]): string[] {
  return symbols
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(s))
    .slice(0, 12)
}

function parseSparkQuote(symbol: string, entry: YahooSparkEntry): NativeClockStockQuote | null {
  const closes = entry.close
  const price = closes?.[closes.length - 1]
  const previous = entry.chartPreviousClose

  if (price == null || !Number.isFinite(price)) return null

  let changePercent = 0
  if (previous != null && previous !== 0 && Number.isFinite(previous)) {
    changePercent = ((price - previous) / previous) * 100
  }

  return {
    symbol: entry.symbol ?? symbol,
    price,
    changePercent,
  }
}

async function fetchSparkBatch(symbols: string[]): Promise<NativeClockStockQuote[]> {
  const url = new URL('https://query1.finance.yahoo.com/v8/finance/spark')
  url.searchParams.set('symbols', symbols.join(','))
  url.searchParams.set('range', '1d')
  url.searchParams.set('interval', '1d')

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': YAHOO_USER_AGENT },
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`Stock quote service unavailable (${response.status})`)
  }

  const data = (await response.json()) as YahooSparkResponse
  const quotes: NativeClockStockQuote[] = []

  for (const symbol of symbols) {
    const entry = data[symbol]
    if (!entry) continue
    const quote = parseSparkQuote(symbol, entry)
    if (quote) quotes.push(quote)
  }

  return quotes
}

export async function fetchStockQuotes(
  symbols: string[]
): Promise<NativeClockStockQuote[]> {
  const normalized = normalizeStockSymbols(symbols)
  if (normalized.length === 0) {
    return []
  }

  const quotes = await fetchSparkBatch(normalized)

  if (quotes.length === 0) {
    throw new Error('No stock quotes returned')
  }

  return quotes
}
