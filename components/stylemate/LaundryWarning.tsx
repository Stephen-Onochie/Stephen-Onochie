'use client'

import { LAUNDRY_WARNING_THRESHOLD } from '@/lib/stylemate/constants'
import type { WardrobeItem } from '@/types/stylemate'

export default function LaundryWarning({ items }: { items: WardrobeItem[] }) {
  const owned = items.filter(i => !i.is_incoming)
  const warnings = (['bottom', 'outerwear'] as const).flatMap(category => {
    const total = owned.filter(i => i.category === category).length
    const clean = owned.filter(i => i.category === category && i.status === 'clean').length
    if (total === 0 || clean >= LAUNDRY_WARNING_THRESHOLD) return []
    const label = category === 'bottom' ? 'bottom' : 'outerwear piece'
    return [`Only ${clean} clean ${label}${clean === 1 ? '' : 's'} left`]
  })

  if (warnings.length === 0) return null

  return (
    <div className="mb-4 rounded-xl px-4 py-3" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}>
      <p className="font-inter text-sm font-semibold" style={{ color: 'var(--iven-text)' }}>Laundry check</p>
      <p className="font-inter text-xs mt-1" style={{ color: 'var(--iven-muted)' }}>{warnings.join(' · ')}</p>
    </div>
  )
}
