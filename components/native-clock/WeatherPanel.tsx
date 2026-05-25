'use client'

import { Cloud, CloudRain, CloudSun, Sun, Wind } from 'lucide-react'
import type { NativeClockWeather } from '@/types/native-clock'

interface WeatherPanelProps {
  weather: NativeClockWeather | null
  loading: boolean
  error: string | null
}

function WeatherIcon({ code }: { code: number }) {
  const className = 'h-5 w-5 shrink-0'
  const style = { color: 'var(--nc-accent)' }
  if (code === 0 || code === 1) return <Sun className={className} style={style} aria-hidden />
  if (code >= 61 && code <= 67)
    return <CloudRain className={className} style={style} aria-hidden />
  if (code >= 51 && code <= 55)
    return <CloudRain className={className} style={style} aria-hidden />
  if (code === 2 || code === 3)
    return <CloudSun className={className} style={style} aria-hidden />
  if (code >= 45 && code <= 48) return <Wind className={className} style={style} aria-hidden />
  return <Cloud className={className} style={style} aria-hidden />
}

export default function WeatherPanel({ weather, loading, error }: WeatherPanelProps) {
  return (
    <aside
      className="rounded-lg border backdrop-blur-sm px-4 py-3 min-w-[11rem] max-w-[16rem]"
      style={{
        backgroundColor: 'var(--nc-surface)',
        borderColor: 'var(--nc-border)',
      }}
      aria-label="Current weather"
    >
      {loading && (
        <p
          className="font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse"
          style={{ color: 'var(--nc-muted)' }}
        >
          Loading weather…
        </p>
      )}

      {!loading && error && (
        <p className="font-inter text-xs" style={{ color: 'var(--nc-muted)' }}>
          {error}
        </p>
      )}

      {!loading && weather && (
        <div className="space-y-2">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.25em] truncate"
            style={{ color: 'var(--nc-muted)' }}
          >
            {weather.location}
          </p>
          <div className="flex items-center gap-2">
            <WeatherIcon code={weather.weatherCode} />
            <span
              className="font-display text-3xl leading-none"
              style={{ color: 'var(--nc-text)' }}
            >
              {weather.temperatureF}°
            </span>
          </div>
          <p className="font-inter text-sm" style={{ color: 'var(--nc-accent)' }}>
            {weather.condition}
          </p>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
            style={{ color: 'var(--nc-muted)' }}
          >
            Humidity {weather.humidity}%
          </p>
        </div>
      )}
    </aside>
  )
}
