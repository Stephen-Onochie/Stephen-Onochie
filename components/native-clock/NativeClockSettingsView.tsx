'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppHeader from '@/components/apps/AppHeader'
import NativeClockNav from '@/components/native-clock/NativeClockNav'
import NativeClockShell from '@/components/native-clock/NativeClockShell'
import {
  getDefaultNativeClockSettings,
  isValidFeedUrl,
  parseStockSymbols,
} from '@/lib/native-clock/settings'
import {
  TICKER_SCROLL_MAX_SEC,
  TICKER_SCROLL_MIN_SEC,
  clampTickerScrollSeconds,
} from '@/lib/native-clock/ticker'
import { useNativeClockSettings } from '@/hooks/useNativeClockSettings'
import type { NativeClockSettings, NativeClockTheme, NativeClockTimeFormat } from '@/types/native-clock'

export default function NativeClockSettingsView() {
  const { settings, hydrated, updateSettings } = useNativeClockSettings()
  const [form, setForm] = useState<NativeClockSettings>(getDefaultNativeClockSettings())
  const [stockInput, setStockInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings) return
    setForm(settings)
    setStockInput(settings.stockSymbols.join(', '))
  }, [settings])

  function handleSave() {
    if (!isValidFeedUrl(form.newsFeedUrl)) {
      setFeedError('Enter a valid http(s) RSS feed URL.')
      return
    }
    setFeedError(null)

    const stockSymbols = parseStockSymbols(stockInput)
    updateSettings({
      ...form,
      stockSymbols: stockSymbols.length > 0 ? stockSymbols : form.stockSymbols,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function patch<K extends keyof NativeClockSettings>(key: K, value: NativeClockSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  if (!hydrated || !settings) {
    return (
      <main className="min-h-screen bg-beige pb-24">
        <AppHeader title="Native Clock" />
        <div className="max-w-lg mx-auto px-4 py-12 animate-pulse bg-surface rounded-2xl h-64 mx-4" />
      </main>
    )
  }

  const theme = form.theme

  return (
    <NativeClockShell theme={theme}>
      <AppHeader
        title="Native Clock"
        right={
          <Link
            href="/apps/native-clock"
            className="font-inter text-sm"
            style={{ color: 'var(--nc-muted)' }}
          >
            Clock
          </Link>
        }
      />

      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">
        <section
          className="rounded-2xl p-5 space-y-4 border"
          style={{ backgroundColor: 'var(--nc-surface)', borderColor: 'var(--nc-border)' }}
        >
          <h2 className="font-playfair text-lg font-bold">Location & weather</h2>
          <label className="block space-y-1">
            <span className="font-inter text-xs" style={{ color: 'var(--nc-muted)' }}>
              Display name
            </span>
            <input
              type="text"
              value={form.locationName}
              onChange={(e) => patch('locationName', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 font-inter text-sm bg-transparent"
              style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-inter text-xs" style={{ color: 'var(--nc-muted)' }}>
                Latitude
              </span>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => patch('lat', parseFloat(e.target.value))}
                disabled={form.useDeviceLocation}
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm bg-transparent disabled:opacity-50"
                style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
              />
            </label>
            <label className="block space-y-1">
              <span className="font-inter text-xs" style={{ color: 'var(--nc-muted)' }}>
                Longitude
              </span>
              <input
                type="number"
                step="any"
                value={form.lon}
                onChange={(e) => patch('lon', parseFloat(e.target.value))}
                disabled={form.useDeviceLocation}
                className="w-full rounded-lg border px-3 py-2 font-mono text-sm bg-transparent disabled:opacity-50"
                style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
              />
            </label>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.useDeviceLocation}
              onChange={(e) => patch('useDeviceLocation', e.target.checked)}
              className="h-4 w-4 accent-[var(--nc-accent)]"
            />
            <span className="font-inter text-sm">Use device GPS for weather</span>
          </label>
        </section>

        <section
          className="rounded-2xl p-5 space-y-4 border"
          style={{ backgroundColor: 'var(--nc-surface)', borderColor: 'var(--nc-border)' }}
        >
          <h2 className="font-playfair text-lg font-bold">Feeds</h2>
          <label className="block space-y-1">
            <span className="font-inter text-xs" style={{ color: 'var(--nc-muted)' }}>
              News RSS feed URL
            </span>
            <input
              type="url"
              value={form.newsFeedUrl}
              onChange={(e) => patch('newsFeedUrl', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 font-mono text-xs bg-transparent"
              style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
              placeholder="https://feeds.npr.org/1001/rss.xml"
            />
            {feedError && (
              <p className="font-inter text-xs text-red-600">{feedError}</p>
            )}
          </label>
          <label className="block space-y-1">
            <span className="font-inter text-xs" style={{ color: 'var(--nc-muted)' }}>
              Stock symbols (comma-separated, max 12)
            </span>
            <input
              type="text"
              value={stockInput}
              onChange={(e) => setStockInput(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm uppercase bg-transparent"
              style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
              placeholder="AAPL, MSFT, GOOGL"
            />
          </label>

          <div className="space-y-3 pt-2">
            <p className="font-inter text-xs" style={{ color: 'var(--nc-muted)' }}>
              Ticker scroll speed — lower seconds = faster scroll
            </p>
            <label className="block space-y-2">
              <span className="font-inter text-sm flex justify-between">
                <span>News headlines</span>
                <span className="font-mono text-xs tabular-nums">
                  {form.newsTickerScrollSec}s
                </span>
              </span>
              <input
                type="range"
                min={TICKER_SCROLL_MIN_SEC}
                max={TICKER_SCROLL_MAX_SEC}
                value={form.newsTickerScrollSec}
                onChange={(e) =>
                  patch(
                    'newsTickerScrollSec',
                    clampTickerScrollSeconds(Number(e.target.value))
                  )
                }
                className="w-full accent-[var(--nc-accent)]"
              />
            </label>
            <label className="block space-y-2">
              <span className="font-inter text-sm flex justify-between">
                <span>Stock quotes</span>
                <span className="font-mono text-xs tabular-nums">
                  {form.stockTickerScrollSec}s
                </span>
              </span>
              <input
                type="range"
                min={TICKER_SCROLL_MIN_SEC}
                max={TICKER_SCROLL_MAX_SEC}
                value={form.stockTickerScrollSec}
                onChange={(e) =>
                  patch(
                    'stockTickerScrollSec',
                    clampTickerScrollSeconds(Number(e.target.value))
                  )
                }
                className="w-full accent-[var(--nc-accent)]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Fast', sec: 20 },
                { label: 'Normal', sec: 40 },
                { label: 'Slow', sec: 70 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    patch('newsTickerScrollSec', preset.sec)
                    patch('stockTickerScrollSec', preset.sec)
                  }}
                  className="px-3 py-1 rounded border font-mono text-[10px] uppercase tracking-wider"
                  style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-muted)' }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          className="rounded-2xl p-5 space-y-4 border"
          style={{ backgroundColor: 'var(--nc-surface)', borderColor: 'var(--nc-border)' }}
        >
          <h2 className="font-playfair text-lg font-bold">Display</h2>

          <div>
            <p className="font-inter text-xs mb-2" style={{ color: 'var(--nc-muted)' }}>
              Time format
            </p>
            <div className="flex gap-2">
              {(['12', '24'] as NativeClockTimeFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => patch('timeFormat', fmt)}
                  className="flex-1 py-2 rounded-lg border font-mono text-xs uppercase tracking-wider transition-colors"
                  style={{
                    borderColor: 'var(--nc-border)',
                    backgroundColor:
                      form.timeFormat === fmt ? 'var(--nc-accent)' : 'transparent',
                    color: form.timeFormat === fmt ? 'var(--nc-bg)' : 'var(--nc-text)',
                  }}
                >
                  {fmt}-hour
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={form.showSeconds}
              onChange={(e) => patch('showSeconds', e.target.checked)}
              className="h-4 w-4 accent-[var(--nc-accent)]"
            />
            <span className="font-inter text-sm">Show seconds on clock</span>
          </label>

          <div>
            <p className="font-inter text-xs mb-2" style={{ color: 'var(--nc-muted)' }}>
              Theme
            </p>
            <div className="flex gap-2">
              {(['light', 'dark'] as NativeClockTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => patch('theme', t)}
                  className="flex-1 py-2 rounded-lg border font-mono text-xs uppercase tracking-wider transition-colors"
                  style={{
                    borderColor: 'var(--nc-border)',
                    backgroundColor: form.theme === t ? 'var(--nc-accent)' : 'transparent',
                    color: form.theme === t ? 'var(--nc-bg)' : 'var(--nc-text)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {(
            [
              ['showSmallTimer', 'Show small timer widget'],
              ['showStockTicker', 'Show stock ticker'],
              ['showNewsTicker', 'Show news headlines'],
              ['showTodaysTasks', "Show today's tasks under the clock"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => patch(key, e.target.checked)}
                className="h-4 w-4 accent-[var(--nc-accent)]"
              />
              <span className="font-inter text-sm">{label}</span>
            </label>
          ))}
        </section>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-lg font-inter font-medium transition-colors"
          style={{ backgroundColor: 'var(--nc-accent)', color: 'var(--nc-bg)' }}
        >
          {saved ? 'Saved' : 'Save settings'}
        </button>

        <p className="font-inter text-xs text-center" style={{ color: 'var(--nc-muted)' }}>
          Settings are stored in this browser only.
        </p>
      </div>

      <NativeClockNav />
    </NativeClockShell>
  )
}
