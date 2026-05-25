'use client'

import type { NativeClockTimeFormat } from '@/types/native-clock'

function formatTime(
  date: Date,
  timeFormat: NativeClockTimeFormat,
  showSeconds: boolean
): { time: string; period: string | null } {
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')

  if (timeFormat === '24') {
    const h = hours.toString().padStart(2, '0')
    const time = showSeconds ? `${h}:${minutes}:${seconds}` : `${h}:${minutes}`
    return { time, period: null }
  }

  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  const time = showSeconds
    ? `${hour12}:${minutes}:${seconds}`
    : `${hour12}:${minutes}`
  return { time, period }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

interface ClockFaceProps {
  now: Date
  timeFormat: NativeClockTimeFormat
  showSeconds: boolean
}

export default function ClockFace({ now, timeFormat, showSeconds }: ClockFaceProps) {
  const { time, period } = formatTime(now, timeFormat, showSeconds)

  return (
    <div className="text-center select-none">
      <div className="flex items-baseline justify-center gap-3 md:gap-5">
        <span
          className="font-display text-[clamp(4.5rem,18vw,12rem)] leading-none tracking-[0.04em] tabular-nums"
          style={{ color: 'var(--nc-text)' }}
        >
          {time}
        </span>
        {period && (
          <span
            className="font-mono text-[clamp(1.25rem,4vw,2.5rem)] uppercase tracking-[0.2em] pb-2 md:pb-4"
            style={{ color: 'var(--nc-accent)' }}
          >
            {period}
          </span>
        )}
      </div>
      <p
        className="mt-4 md:mt-6 font-mono text-xs md:text-sm uppercase tracking-[0.35em]"
        style={{ color: 'var(--nc-muted)' }}
      >
        {formatDate(now)}
      </p>
    </div>
  )
}
