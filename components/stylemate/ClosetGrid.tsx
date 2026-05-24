'use client'

import { useMemo, useState } from 'react'
import ItemCard from '@/components/stylemate/ItemCard'
import { APPAREL_CATEGORIES, ARCHETYPES } from '@/lib/stylemate/constants'
import type { ApparelCategory, LaundryStatus, WardrobeItemWithSignedUrl } from '@/types/stylemate'

interface ClosetGridProps {
  items: WardrobeItemWithSignedUrl[]
  onStatusChange: (id: string, status: LaundryStatus) => void
  onItemClick: (item: WardrobeItemWithSignedUrl) => void
}

export default function ClosetGrid({ items, onStatusChange, onItemClick }: ClosetGridProps) {
  const [categoryFilter, setCategoryFilter] = useState<ApparelCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<LaundryStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      return true
    })
  }, [items, categoryFilter, statusFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, WardrobeItemWithSignedUrl[]>()
    for (const item of filtered) {
      const key = item.archetype || 'casual_weekend'
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    const order = ARCHETYPES.map((a) => a.value)
    return order
      .filter((a) => map.has(a))
      .map((archetype) => ({
        archetype,
        label: ARCHETYPES.find((a) => a.value === archetype)?.label ?? archetype,
        items: map.get(archetype) ?? [],
      }))
  }, [filtered])

  if (items.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-4xl mb-3">👔</p>
        <p className="text-textMuted font-inter text-sm">Your closet is empty. Add your first item!</p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ApparelCategory | 'all')}
          className="text-xs font-inter border border-goldLight rounded-lg px-3 py-2 bg-beige text-textPrimary focus:outline-none focus:border-gold"
        >
          <option value="all">All categories</option>
          {APPAREL_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LaundryStatus | 'all')}
          className="text-xs font-inter border border-goldLight rounded-lg px-3 py-2 bg-beige text-textPrimary focus:outline-none focus:border-gold"
        >
          <option value="all">All statuses</option>
          <option value="clean">Clean</option>
          <option value="dirty">Dirty</option>
          <option value="laundry_cycle">In laundry</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-textMuted font-inter text-sm py-12">No items match these filters.</p>
      ) : (
        grouped.map((group) => (
          <section key={group.archetype} className="mb-8">
            <h2 className="font-playfair text-lg font-bold text-textPrimary mb-3">{group.label}</h2>
            <div className="grid grid-cols-2 gap-3">
              {group.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onStatusChange={onStatusChange}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
