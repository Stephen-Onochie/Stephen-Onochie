'use client'

import { computeProgress } from '@/lib/standing-timer/timer-engine'

interface ProgressRingProps {
  remainingSeconds: number
  plannedSeconds: number
  modeColor?: string
  children: React.ReactNode
}

export default function ProgressRing({
  remainingSeconds,
  plannedSeconds,
  modeColor = '#C9A84C',
  children,
}: ProgressRingProps) {
  const size = 280
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = computeProgress(remainingSeconds, plannedSeconds)
  const offset = circumference * (1 - progress)

  return (
    <div className="relative mx-auto w-[280px] h-[280px] md:w-[320px] md:h-[320px]">
      <svg
        className="w-full h-full -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EDE8DC"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={modeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        {children}
      </div>
    </div>
  )
}
