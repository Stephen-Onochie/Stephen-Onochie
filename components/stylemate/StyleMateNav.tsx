'use client'

import { MessageCircle, Shirt, Sparkles } from 'lucide-react'
import type { StyleMateTab } from '@/types/stylemate'

const TABS: { id: StyleMateTab; label: string; Icon: typeof Shirt }[] = [
  { id: 'closet', label: 'Closet', Icon: Shirt },
  { id: 'outfits', label: 'Outfits', Icon: Sparkles },
  { id: 'stylist', label: 'Stylist', Icon: MessageCircle },
]

export default function StyleMateNav({
  activeTab,
  onTabChange,
}: {
  activeTab: StyleMateTab
  onTabChange: (tab: StyleMateTab) => void
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl mb-6 w-full sm:w-auto sm:inline-flex" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}>
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-mono text-[11px] uppercase tracking-[1.5px] font-semibold transition-colors"
            style={active ? { background: 'var(--iven-accent)', color: '#2C1F0E' } : { color: 'var(--iven-muted)' }}
          >
            <Icon size={14} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
