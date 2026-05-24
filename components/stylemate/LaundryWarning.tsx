'use client'

import { LAUNDRY_WARNING_THRESHOLD } from '@/lib/stylemate/constants'
import type { WardrobeItem } from '@/types/stylemate'

interface LaundryWarningProps {
  items: WardrobeItem[]
}

export default function LaundryWarning({ items }: LaundryWarningProps) {
  const cleanOuterwear = items.filter(
    (i) => i.category === 'outerwear' && i.status === 'clean' && !i.is_incoming
  ).length
  const cleanBottoms = items.filter(
    (i) => i.category === 'bottom' && i.status === 'clean' && !i.is_incoming
  ).length

  const warnings: string[] = []
  if (cleanOuterwear < LAUNDRY_WARNING_THRESHOLD) {
    warnings.push(
      `Only ${cleanOuterwear} clean outerwear item${cleanOuterwear === 1 ? '' : 's'} left`
    )
  }
  if (cleanBottoms < LAUNDRY_WARNING_THRESHOLD) {
    warnings.push(
      `Only ${cleanBottoms} clean bottom${cleanBottoms === 1 ? '' : 's'} left`
    )
  }

  if (warnings.length === 0) return null

  return (
    <div className="mx-4 mb-4 rounded-xl border border-gold bg-surface px-4 py-3">
      <p className="font-inter text-sm font-medium text-brownAccent">Wardrobe friction</p>
      <p className="font-inter text-xs text-textMuted mt-1">{warnings.join(' · ')}</p>
    </div>
  )
}
