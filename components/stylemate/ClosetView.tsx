'use client'

import { useMemo, useState } from 'react'
import { Loader2, Package, ScanLine, Search } from 'lucide-react'
import { APPAREL_CATEGORIES } from '@/lib/stylemate/constants'
import type { ApparelCategory, WardrobeItemView } from '@/types/stylemate'
import { Button, Chip, inputStyle, ItemImage, SectionLabel } from './shared'

type SortKey = 'newest' | 'most_worn' | 'least_worn' | 'color' | 'formality'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'most_worn', label: 'Most worn' },
  { key: 'least_worn', label: 'Least worn' },
  { key: 'color', label: 'Color' },
  { key: 'formality', label: 'Formality' },
]

function matches(item: WardrobeItemView, q: string): boolean {
  if (!q) return true
  const hay = [item.name, item.color, ...item.colors, item.brand, item.sub_type, item.pattern, item.material, item.fit, ...item.style_tags, ...item.occasions]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return q.toLowerCase().split(/\s+/).every(word => hay.includes(word))
}

function sortItems(items: WardrobeItemView[], key: SortKey): WardrobeItemView[] {
  const sorted = [...items]
  switch (key) {
    case 'newest': return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    case 'most_worn': return sorted.sort((a, b) => b.wear_count - a.wear_count)
    case 'least_worn': return sorted.sort((a, b) => a.wear_count - b.wear_count)
    case 'color': return sorted.sort((a, b) => a.color.localeCompare(b.color))
    case 'formality': return sorted.sort((a, b) => b.formality - a.formality)
  }
}

function ItemCard({ item, onClick }: { item: WardrobeItemView; onClick: () => void }) {
  const traits = [item.fit && item.fit !== 'n/a' ? item.fit : null, item.pattern && item.pattern !== 'solid' ? item.pattern : null, ...item.style_tags.slice(0, 1)]
    .filter(Boolean)
    .slice(0, 2)
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}
    >
      <div className="relative">
        <ItemImage item={item} className="aspect-square" />
        {item.render_status === 'pending' && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[1px]" style={{ background: 'rgba(20,16,12,0.7)', color: '#F5F0E8' }}>
            <Loader2 size={10} className="animate-spin" /> Rendering
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-inter text-[13px] font-semibold leading-tight line-clamp-2" style={{ color: 'var(--iven-text)' }}>{item.name}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color_hex ?? '#888', border: '1px solid var(--iven-grid)' }} />
          <span className="font-inter text-[11px] truncate" style={{ color: 'var(--iven-muted)' }}>
            {[item.color, ...traits].join(' · ')}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function ClosetView({
  items,
  onOpenItem,
  onScan,
}: {
  items: WardrobeItemView[]
  onOpenItem: (item: WardrobeItemView) => void
  onScan: () => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ApparelCategory | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('newest')

  const owned = useMemo(() => items.filter(i => !i.is_incoming), [items])
  const incoming = useMemo(() => items.filter(i => i.is_incoming), [items])
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    owned.forEach(i => map.set(i.category, (map.get(i.category) ?? 0) + 1))
    return map
  }, [owned])

  const visible = useMemo(
    () => sortItems(owned.filter(i => (category === 'all' || i.category === category) && matches(i, query)), sort),
    [owned, category, query, sort],
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--iven-muted)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search color, brand, type, vibe…"
            className="w-full font-inter text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none"
            style={inputStyle()}
          />
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="font-mono text-[11px] uppercase tracking-[1px] rounded-xl px-3 py-2.5 outline-none"
          style={inputStyle()}
          aria-label="Sort"
        >
          {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <Button onClick={onScan} className="py-2.5"><ScanLine size={14} /> Scan clothes</Button>
      </div>

      {incoming.length > 0 && (
        <div className="mb-5 rounded-2xl p-4" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}>
          <SectionLabel><span className="inline-flex items-center gap-1.5"><Package size={12} /> On the way · {incoming.length}</span></SectionLabel>
          <p className="font-inter text-xs mb-3" style={{ color: 'var(--iven-muted)' }}>Found in your Gmail orders. Tap one to check its tags and approve it once it arrives.</p>
          <div className="flex gap-3 overflow-x-auto iven-no-scrollbar pb-1">
            {incoming.map(item => (
              <button key={item.id} type="button" onClick={() => onOpenItem(item)} className="w-28 shrink-0 text-left">
                <ItemImage item={item} className="aspect-square rounded-xl" />
                <p className="font-inter text-[11px] mt-1.5 line-clamp-2" style={{ color: 'var(--iven-text)' }}>{item.name}</p>
                <p className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>{item.retailer}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto iven-no-scrollbar mb-5 pb-1">
        <Chip active={category === 'all'} onClick={() => setCategory('all')} count={owned.length}>All</Chip>
        {APPAREL_CATEGORIES.filter(c => counts.get(c.value)).map(c => (
          <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)} count={counts.get(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>

      {owned.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-2xl" style={{ border: '1px dashed var(--iven-grid)' }}>
          <p className="font-playfair text-xl font-bold mb-2" style={{ color: 'var(--iven-text)' }}>Your closet is empty</p>
          <p className="font-inter text-sm mb-5" style={{ color: 'var(--iven-muted)' }}>
            Snap your clothes (one per photo, or lay a few out together) and Claude tags each piece.
          </p>
          <Button onClick={onScan}><ScanLine size={14} /> Scan your first pieces</Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="font-inter text-sm text-center py-16" style={{ color: 'var(--iven-muted)' }}>Nothing matches that search.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visible.map(item => <ItemCard key={item.id} item={item} onClick={() => onOpenItem(item)} />)}
        </div>
      )}
    </div>
  )
}
