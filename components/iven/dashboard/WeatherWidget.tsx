'use client'

import { useEffect, useState } from 'react'

interface WeatherData {
  temperature: number
  condition: string
  location: string
  high: number
  low: number
  hourly?: { hour: string; temp: number }[]
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/native-clock/weather')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setWeather(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="rounded-[18px] p-6"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase mb-4" style={{ color: 'var(--iven-accent)' }}>
        WEATHER
      </div>
      {loading ? (
        <div className="h-20 rounded-lg animate-pulse" style={{ background: 'var(--iven-grid)', opacity: 0.3 }} />
      ) : !weather ? (
        <div className="font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>UNAVAILABLE</div>
      ) : (
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono font-semibold leading-none" style={{ fontSize: 42, color: 'var(--iven-text)' }}>
                {Math.round(weather.temperature)}
              </span>
              <span className="font-mono text-lg" style={{ color: 'var(--iven-muted)' }}>°F</span>
            </div>
            <div className="font-playfair italic text-base mt-2" style={{ color: 'var(--iven-muted)' }}>{weather.condition}</div>
            <div className="font-mono text-[10px] tracking-[0.5px] uppercase mt-1" style={{ color: 'var(--iven-muted)' }}>
              {weather.location} · H{Math.round(weather.high)}° L{Math.round(weather.low)}°
            </div>
          </div>
          {weather.hourly && (
            <div className="flex gap-3">
              {weather.hourly.slice(0, 4).map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="font-mono text-[9px]" style={{ color: 'var(--iven-muted)' }}>{h.hour}</span>
                  <span className="w-[5px] h-[5px] rounded-full" style={{ background: 'var(--iven-accent)' }} />
                  <span className="font-mono text-[11px]" style={{ color: 'var(--iven-muted)' }}>{Math.round(h.temp)}°</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
