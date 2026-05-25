import type { NativeClockStockQuote } from '@/types/native-clock'

const CACHE_TTL_MS = 5 * 60 * 1000
const STALE_TTL_MS = 30 * 60 * 1000

interface CacheEntry {
  quotes: NativeClockStockQuote[]
  fetchedAt: number
}

const store = new Map<string, CacheEntry>()

export function stockCacheKey(symbols: string[]): string {
  return [...symbols].sort().join(',')
}

export function getCachedStockQuotes(key: string): {
  quotes: NativeClockStockQuote[]
  fresh: boolean
} | null {
  const entry = store.get(key)
  if (!entry) return null

  const age = Date.now() - entry.fetchedAt
  if (age > STALE_TTL_MS) {
    store.delete(key)
    return null
  }

  return {
    quotes: entry.quotes,
    fresh: age <= CACHE_TTL_MS,
  }
}

export function setCachedStockQuotes(key: string, quotes: NativeClockStockQuote[]): void {
  store.set(key, { quotes, fetchedAt: Date.now() })
}
