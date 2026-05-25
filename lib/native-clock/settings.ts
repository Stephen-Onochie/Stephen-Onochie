import {
  clampTickerScrollSeconds,
  TICKER_SCROLL_DEFAULT_SEC,
} from '@/lib/native-clock/ticker'
import type { NativeClockSettings } from '@/types/native-clock'

export const NATIVE_CLOCK_SETTINGS_KEY = 'native-clock-settings'
export const NATIVE_CLOCK_SETTINGS_EVENT = 'native-clock-settings-updated'

const DEFAULT_NEWS_FEED = 'https://feeds.npr.org/1001/rss.xml'

export function getDefaultNativeClockSettings(): NativeClockSettings {
  const lat = parseFloat(process.env.NATIVE_CLOCK_LAT ?? '40.4259')
  const lon = parseFloat(process.env.NATIVE_CLOCK_LON ?? '-86.9081')

  return {
    locationName: process.env.NATIVE_CLOCK_LOCATION?.trim() || 'West Lafayette',
    lat: Number.isNaN(lat) ? 40.4259 : lat,
    lon: Number.isNaN(lon) ? -86.9081 : lon,
    useDeviceLocation: false,
    newsFeedUrl: process.env.NATIVE_CLOCK_NEWS_FEED?.trim() || DEFAULT_NEWS_FEED,
    stockSymbols: ['AAPL', 'MSFT', 'GOOGL', 'NVDA'],
    timeFormat: '12',
    theme: 'light',
    showSeconds: true,
    showSmallTimer: false,
    showStockTicker: true,
    showNewsTicker: true,
    newsTickerScrollSec: TICKER_SCROLL_DEFAULT_SEC,
    stockTickerScrollSec: TICKER_SCROLL_DEFAULT_SEC,
  }
}

export function parseStockSymbols(input: string): string[] {
  const seen = new Set<string>()
  const symbols: string[] = []

  for (const part of input.split(/[\s,;]+/)) {
    const symbol = part.trim().toUpperCase().replace(/^\$/, '')
    if (!symbol || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) continue
    if (seen.has(symbol)) continue
    seen.add(symbol)
    symbols.push(symbol)
    if (symbols.length >= 12) break
  }

  return symbols
}

function isValidSettings(value: unknown): value is NativeClockSettings {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return (
    typeof s.locationName === 'string' &&
    typeof s.lat === 'number' &&
    typeof s.lon === 'number' &&
    typeof s.useDeviceLocation === 'boolean' &&
    typeof s.newsFeedUrl === 'string' &&
    Array.isArray(s.stockSymbols) &&
    (s.timeFormat === '12' || s.timeFormat === '24') &&
    (s.theme === 'light' || s.theme === 'dark') &&
    typeof s.showSeconds === 'boolean' &&
    typeof s.showSmallTimer === 'boolean' &&
    typeof s.showStockTicker === 'boolean' &&
    typeof s.showNewsTicker === 'boolean'
  )
}

export function mergeNativeClockSettings(
  partial: Partial<NativeClockSettings>
): NativeClockSettings {
  const defaults = getDefaultNativeClockSettings()
  const merged = { ...defaults, ...partial }

  if (partial.stockSymbols) {
    merged.stockSymbols = parseStockSymbols(partial.stockSymbols.join(','))
  }

  if (Number.isNaN(merged.lat) || merged.lat < -90 || merged.lat > 90) {
    merged.lat = defaults.lat
  }
  if (Number.isNaN(merged.lon) || merged.lon < -180 || merged.lon > 180) {
    merged.lon = defaults.lon
  }

  merged.locationName = merged.locationName.trim() || defaults.locationName
  merged.newsFeedUrl = merged.newsFeedUrl.trim() || defaults.newsFeedUrl

  merged.newsTickerScrollSec = clampTickerScrollSeconds(
    merged.newsTickerScrollSec ?? defaults.newsTickerScrollSec
  )
  merged.stockTickerScrollSec = clampTickerScrollSeconds(
    merged.stockTickerScrollSec ?? defaults.stockTickerScrollSec
  )

  return merged
}

export function loadNativeClockSettings(): NativeClockSettings {
  if (typeof window === 'undefined') return getDefaultNativeClockSettings()

  try {
    const raw = localStorage.getItem(NATIVE_CLOCK_SETTINGS_KEY)
    if (!raw) return getDefaultNativeClockSettings()
    const parsed: unknown = JSON.parse(raw)
    if (!isValidSettings(parsed)) return getDefaultNativeClockSettings()
    return mergeNativeClockSettings(parsed as NativeClockSettings)
  } catch {
    return getDefaultNativeClockSettings()
  }
}

export function saveNativeClockSettings(settings: NativeClockSettings): void {
  const merged = mergeNativeClockSettings(settings)
  localStorage.setItem(NATIVE_CLOCK_SETTINGS_KEY, JSON.stringify(merged))
  window.dispatchEvent(new CustomEvent(NATIVE_CLOCK_SETTINGS_EVENT))
}

export function isValidFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
