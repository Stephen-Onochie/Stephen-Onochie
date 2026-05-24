'use client'

import { MODE_COLORS, MODE_ICONS, MODE_LABELS } from '@/lib/standing-timer/cycle'
import type { WorkstationMode } from '@/types/standing-timer'

interface ModeBadgeProps {
  mode: WorkstationMode
  size?: 'sm' | 'lg'
}

export default function ModeBadge({ mode, size = 'lg' }: ModeBadgeProps) {
  const isLarge = size === 'lg'

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border font-inter font-semibold uppercase tracking-[0.15em] ${
        isLarge ? 'px-5 py-2 text-sm md:text-base' : 'px-3 py-1 text-xs'
      }`}
      style={{
        borderColor: MODE_COLORS[mode],
        color: MODE_COLORS[mode],
      }}
    >
      <span>{MODE_ICONS[mode]}</span>
      <span>{MODE_LABELS[mode]}</span>
    </div>
  )
}
