'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import ClockFace from '@/components/native-clock/ClockFace'
import NativeClockNav from '@/components/native-clock/NativeClockNav'
import NativeClockShell from '@/components/native-clock/NativeClockShell'
import NewsHeadlines from '@/components/native-clock/NewsHeadlines'
import SmallTimer from '@/components/native-clock/SmallTimer'
import StockTicker from '@/components/native-clock/StockTicker'
import WeatherPanel from '@/components/native-clock/WeatherPanel'
import { useNativeClockSettings } from '@/hooks/useNativeClockSettings'
import type {
  NativeClockHeadline,
  NativeClockNewsResponse,
  NativeClockSettings,
  NativeClockStockQuote,
  NativeClockStocksResponse,
  NativeClockWeather,
} from '@/types/native-clock'

const WEATHER_REFRESH_MS = 15 * 60 * 1000
const NEWS_REFRESH_MS = 30 * 60 * 1000
const STOCK_REFRESH_MS = 60 * 1000

export default function NativeClockView() {
  const { settings, hydrated } = useNativeClockSettings()
  const [now, setNow] = useState(() => new Date())
  const [weather, setWeather] = useState<NativeClockWeather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [headlines, setHeadlines] = useState<NativeClockHeadline[]>([])
  const [newsSource, setNewsSource] = useState('News')
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<NativeClockStockQuote[]>([])
  const [stocksLoading, setStocksLoading] = useState(true)
  const [stocksError, setStocksError] = useState<string | null>(null)
  const settingsRef = useRef<NativeClockSettings | null>(null)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const loadWeather = useCallback(async (active?: NativeClockSettings) => {
    const s = active ?? settingsRef.current
    if (!s) return

    setWeatherLoading(true)
    setWeatherError(null)

    const params = new URLSearchParams()

    const applyCoords = (lat: number, lon: number, location: string) => {
      params.set('lat', String(lat))
      params.set('lon', String(lon))
      params.set('location', location)
    }

    if (s.useDeviceLocation && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8000,
            maximumAge: 600_000,
          })
        })
        applyCoords(
          position.coords.latitude,
          position.coords.longitude,
          'Your location'
        )
      } catch {
        applyCoords(s.lat, s.lon, s.locationName)
      }
    } else {
      applyCoords(s.lat, s.lon, s.locationName)
    }

    try {
      const response = await fetch(`/api/native-clock/weather?${params}`)
      if (!response.ok) throw new Error('unavailable')
      const data = (await response.json()) as NativeClockWeather
      setWeather(data)
    } catch {
      setWeatherError('Weather unavailable')
      setWeather(null)
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  const loadNews = useCallback(async (active?: NativeClockSettings) => {
    const s = active ?? settingsRef.current
    if (!s) return

    setNewsLoading(true)
    setNewsError(null)

    const params = new URLSearchParams()
    if (s.newsFeedUrl) params.set('feed', s.newsFeedUrl)

    try {
      const response = await fetch(
        `/api/native-clock/news${params.toString() ? `?${params}` : ''}`
      )
      if (!response.ok) throw new Error('unavailable')
      const data = (await response.json()) as NativeClockNewsResponse
      setHeadlines(data.headlines)
      setNewsSource(data.source)
    } catch {
      setNewsError('Headlines unavailable')
      setHeadlines([])
    } finally {
      setNewsLoading(false)
    }
  }, [])

  const loadStocks = useCallback(async (active?: NativeClockSettings) => {
    const s = active ?? settingsRef.current
    if (!s || !s.showStockTicker || s.stockSymbols.length === 0) {
      setQuotes([])
      setStocksLoading(false)
      setStocksError(null)
      return
    }

    setStocksLoading(true)
    setStocksError(null)

    const params = new URLSearchParams()
    params.set('symbols', s.stockSymbols.join(','))

    try {
      const response = await fetch(`/api/native-clock/stocks?${params}`)
      if (!response.ok) throw new Error('unavailable')
      const data = (await response.json()) as NativeClockStocksResponse
      setQuotes(data.quotes)
    } catch {
      setStocksError('Quotes unavailable')
      setQuotes([])
    } finally {
      setStocksLoading(false)
    }
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    if (!hydrated || !settings) return

    void loadWeather(settings)
    if (settings.showNewsTicker) void loadNews(settings)
    else {
      setHeadlines([])
      setNewsLoading(false)
    }
    void loadStocks(settings)

    const weatherInterval = setInterval(() => void loadWeather(), WEATHER_REFRESH_MS)
    const newsInterval = setInterval(
      () => {
        if (settingsRef.current?.showNewsTicker) void loadNews()
      },
      NEWS_REFRESH_MS
    )
    const stockInterval = setInterval(() => void loadStocks(), STOCK_REFRESH_MS)

    return () => {
      clearInterval(weatherInterval)
      clearInterval(newsInterval)
      clearInterval(stockInterval)
    }
  }, [hydrated, settings, loadWeather, loadNews, loadStocks])

  if (!hydrated || !settings) {
    return (
      <main className="min-h-screen bg-beige flex items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-textMuted animate-pulse">
          Loading…
        </p>
      </main>
    )
  }

  return (
    <NativeClockShell theme={settings.theme}>
      <div className="flex-1 flex flex-col relative px-4 md:px-8 pt-4 md:pt-6 pb-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex flex-col gap-2">
            <Link
              href="/apps"
              className="font-mono text-[10px] uppercase tracking-[0.25em] transition-colors duration-200"
              style={{ color: 'var(--nc-muted)' }}
            >
              ← My Apps
            </Link>
            <NativeClockNav compact />
          </div>
          <div className="flex flex-col items-end gap-2">
            <WeatherPanel
              weather={weather}
              loading={weatherLoading}
              error={weatherError}
            />
            <SmallTimer visible={settings.showSmallTimer} />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-8 md:py-12">
          <p
            className="mb-6 md:mb-10 font-mono text-[10px] md:text-xs uppercase tracking-[0.4em]"
            style={{ color: 'var(--nc-accent)' }}
          >
            Native Clock
          </p>
          <ClockFace
            now={now}
            timeFormat={settings.timeFormat}
            showSeconds={settings.showSeconds}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          aria-hidden
          style={{
            backgroundImage:
              'linear-gradient(var(--nc-accent) 1px, transparent 1px), linear-gradient(90deg, var(--nc-accent) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {settings.showStockTicker && (
        <StockTicker quotes={quotes} loading={stocksLoading} error={stocksError} />
      )}

      {settings.showNewsTicker && (
        <NewsHeadlines
          headlines={headlines}
          source={newsSource}
          loading={newsLoading}
          error={newsError}
        />
      )}

      <div className="h-[60px]" aria-hidden />
      <NativeClockNav />
    </NativeClockShell>
  )
}
