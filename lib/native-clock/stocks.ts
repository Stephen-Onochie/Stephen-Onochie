import {
  getCachedStockQuotes,
  setCachedStockQuotes,
  stockCacheKey,
} from '@/lib/native-clock/stocks-cache'
import type { NativeClockStockQuote } from '@/types/native-clock'

const YAHOO_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const CHART_DELAY_MS = 350

interface YahooSparkEntry {
  symbol?: string
  close?: number[]
  chartPreviousClose?: number
}

interface YahooSparkResponse {
  [symbol: string]: YahooSparkEntry
}

interface YahooChartMeta {
  symbol?: string
  regularMarketPrice?: number
  chartPreviousClose?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function normalizeStockSymbols(symbols: string[]): string[] {
  return symbols
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(s))
    .slice(0, 12)
}

function toStooqSymbol(symbol: string): string {
  if (symbol.includes('.')) return symbol.toLowerCase()
  return `${symbol.toLowerCase()}.us`
}

function quoteFromPrices(
  symbol: string,
  price: number,
  previous: number | null | undefined
): NativeClockStockQuote {
  let changePercent = 0
  if (previous != null && previous !== 0 && Number.isFinite(previous)) {
    changePercent = ((price - previous) / previous) * 100
  }
  return { symbol, price, changePercent }
}

function parseSparkQuote(symbol: string, entry: YahooSparkEntry): NativeClockStockQuote | null {
  const closes = entry.close
  const price = closes?.[closes.length - 1]
  const previous = entry.chartPreviousClose
  if (price == null || !Number.isFinite(price)) return null
  return quoteFromPrices(entry.symbol ?? symbol, price, previous)
}

async function fetchYahooSparkBatch(symbols: string[]): Promise<NativeClockStockQuote[]> {
  const url = new URL('https://query1.finance.yahoo.com/v8/finance/spark')
  url.searchParams.set('symbols', symbols.join(','))
  url.searchParams.set('range', '1d')
  url.searchParams.set('interval', '1d')

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': YAHOO_USER_AGENT },
    cache: 'no-store',
  })

  if (response.status === 429) {
    const err = new Error('Yahoo rate limited (429)') as Error & { status?: number }
    err.status = 429
    throw err
  }

  if (!response.ok) {
    throw new Error(`Yahoo spark unavailable (${response.status})`)
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

async function fetchYahooChartSymbol(symbol: string): Promise<NativeClockStockQuote | null> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  )
  url.searchParams.set('interval', '1d')
  url.searchParams.set('range', '1d')

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': YAHOO_USER_AGENT },
    cache: 'no-store',
  })

  if (!response.ok) return null

  const data = (await response.json()) as {
    chart?: { result?: { meta?: YahooChartMeta }[] }
  }
  const meta = data.chart?.result?.[0]?.meta
  if (!meta) return null
  const price = meta.regularMarketPrice
  if (price == null || !Number.isFinite(price)) return null

  return quoteFromPrices(meta.symbol ?? symbol, price, meta.chartPreviousClose)
}

async function fetchYahooChartSequential(
  symbols: string[]
): Promise<NativeClockStockQuote[]> {
  const quotes: NativeClockStockQuote[] = []

  for (const symbol of symbols) {
    await sleep(CHART_DELAY_MS)
    const quote = await fetchYahooChartSymbol(symbol)
    if (quote) quotes.push(quote)
  }

  return quotes
}

async function fetchStooqSymbol(symbol: string): Promise<NativeClockStockQuote | null> {
  const url = new URL('https://stooq.com/q/l/')
  url.searchParams.set('s', toStooqSymbol(symbol))
  url.searchParams.set('f', 'sd2t2c1ohlcv')
  url.searchParams.set('h', '')
  url.searchParams.set('e', 'csv')

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': YAHOO_USER_AGENT },
    cache: 'no-store',
  })

  if (!response.ok) return null

  const text = await response.text()
  const lines = text.trim().split('\n')
  if (lines.length < 2) return null

  const cols = lines[1].split(',')
  const open = parseFloat(cols[3])
  const close = parseFloat(cols[6])
  if (!Number.isFinite(close)) return null

  const previous = Number.isFinite(open) && open !== 0 ? open : null
  return quoteFromPrices(symbol, close, previous)
}

async function fetchStooqSequential(symbols: string[]): Promise<NativeClockStockQuote[]> {
  const quotes: NativeClockStockQuote[] = []

  for (const symbol of symbols) {
    await sleep(200)
    const quote = await fetchStooqSymbol(symbol)
    if (quote) quotes.push(quote)
  }

  return quotes
}

async function fetchQuotesWithFallbacks(
  symbols: string[]
): Promise<NativeClockStockQuote[]> {
  try {
    const spark = await fetchYahooSparkBatch(symbols)
    if (spark.length > 0) return spark
  } catch {
    // Rate limits and transient errors — try slower fallbacks below.
  }

  const chart = await fetchYahooChartSequential(symbols)
  if (chart.length > 0) return chart

  const stooq = await fetchStooqSequential(symbols)
  if (stooq.length > 0) return stooq

  return []
}

export async function fetchStockQuotes(
  symbols: string[]
): Promise<NativeClockStockQuote[]> {
  const normalized = normalizeStockSymbols(symbols)
  if (normalized.length === 0) {
    return []
  }

  const cacheKey = stockCacheKey(normalized)
  const cached = getCachedStockQuotes(cacheKey)
  if (cached?.fresh) {
    return cached.quotes
  }

  try {
    const quotes = await fetchQuotesWithFallbacks(normalized)
    if (quotes.length === 0) {
      if (cached) return cached.quotes
      throw new Error('No stock quotes returned')
    }
    setCachedStockQuotes(cacheKey, quotes)
    return quotes
  } catch (error) {
    if (cached) return cached.quotes
    throw error
  }
}
