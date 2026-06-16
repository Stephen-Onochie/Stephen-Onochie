'use client'

import { useEffect, useState } from 'react'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function ClockHeroWidget() {
  const [now, setNow] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [sessionStart] = useState(() => Date.now())

  useEffect(() => {
    setNow(new Date())
    setMounted(true)
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!mounted || !now) {
    return (
      <div
        className="rounded-[18px] p-8 animate-pulse"
        style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)', minHeight: 140 }}
      />
    )
  }

  const hr = now.getHours()
  const h12 = ((hr + 11) % 12) + 1
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const dayMin = hr * 60 + now.getMinutes()
  const dayPct = Math.round((dayMin / 1440) * 100)

  const upSec = Math.floor((Date.now() - sessionStart) / 1000)
  const uptime = `${pad(Math.floor(upSec / 60))}:${pad(upSec % 60)}`

  const dateStr = `${DAYS[now.getDay()]} · ${pad(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`

  return (
    <div
      className="rounded-[18px] p-8 flex justify-between items-end gap-9"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      <div>
        <div className="font-mono text-[10px] font-semibold tracking-[3px] uppercase mb-3" style={{ color: 'var(--iven-accent)' }}>
          OPERATOR · S. ONOCHIE
        </div>
        <div className="font-playfair italic text-[26px] mb-2" style={{ color: 'var(--iven-muted)' }}>
          {greeting(hr)}.
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-mono font-semibold leading-[0.9]" style={{ fontSize: 76, letterSpacing: -3, color: 'var(--iven-text)' }}>
            {pad(h12)}:{pad(now.getMinutes())}
          </span>
          <span className="font-mono font-medium text-2xl" style={{ color: 'var(--iven-accent)' }}>
            {pad(now.getSeconds())}
          </span>
          <span className="font-mono font-medium text-base tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
            {ampm}
          </span>
        </div>
        <div className="font-mono text-xs tracking-[2px] mt-3" style={{ color: 'var(--iven-muted)' }}>
          {dateStr}
        </div>
      </div>

      <div className="flex flex-col items-end gap-3">
        <div
          className="flex items-center gap-2 px-3 py-[6px] rounded-full"
          style={{ border: '1px solid var(--iven-border)', background: 'var(--iven-bg)' }}
        >
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: 'var(--iven-accent)' }} />
          <span className="font-mono text-[10px] tracking-[2px]" style={{ color: 'var(--iven-muted)' }}>
            ALL SYSTEMS NOMINAL
          </span>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <div className="font-mono text-[9px] tracking-[2px] mb-1" style={{ color: 'var(--iven-muted)' }}>DAY PROGRESS</div>
            <div className="font-mono text-xl font-semibold" style={{ color: 'var(--iven-text)' }}>
              {dayPct}<span className="text-xs" style={{ color: 'var(--iven-muted)' }}>%</span>
            </div>
          </div>
          <div className="text-right pl-6" style={{ borderLeft: '1px solid var(--iven-grid)' }}>
            <div className="font-mono text-[9px] tracking-[2px] mb-1" style={{ color: 'var(--iven-muted)' }}>SESSION</div>
            <div className="font-mono text-xl font-semibold" style={{ color: 'var(--iven-text)' }}>
              {uptime}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
