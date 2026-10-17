'use client'

import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, Loader2, Search, X } from 'lucide-react'
import { APPAREL_CATEGORIES, SLOT_LABELS } from '@/lib/stylemate/constants'
import { isSweater } from '@/lib/stylemate/rules'
import type { ApparelCategory, OutfitSlot, OutfitView, WardrobeItemView } from '@/types/stylemate'
import { Button, Chip, inputStyle, ItemImage, SectionLabel } from './shared'

const SLOTS: OutfitSlot[] = ['class', 'casual', 'gym', 'going_out', 'custom']
const CATEGORY_ORDER = APPAREL_CATEGORIES.map(c => c.value as string)

export interface BuilderResult {
  item_ids: string[]
  title: string
  slot: OutfitSlot
  plan_date: string | null
}

function hints(pieces: WardrobeItemView[], hasEyewearInCloset: boolean): string[] {
  const has = (c: ApparelCategory) => pieces.some(p => p.category === c)
  const out: string[] = []
  if (!has('top')) out.push('No top yet')
  if (!has('bottom')) out.push('No bottoms yet')
  if (!has('footwear')) out.push('No shoes yet')
  if (hasEyewearInCloset && !has('eyewear')) out.push('Add a pair of glasses')
  if (pieces.some(isSweater) && pieces.some(p => !isSweater(p) && (p.category === 'top' || p.category === 'outerwear'))) {
    out.push('Your rule: sweaters are worn alone, with no other top or outerwear')
  }
  return out
}

export default function OutfitBuilder({
  open,
  outfit,
  items,
  dark,
  defaultDate,
  onClose,
  onSave,
}: {
  open: boolean
  outfit: OutfitView | null
  items: WardrobeItemView[]
  dark: boolean
  defaultDate: string | null
  onClose: () => void
  onSave: (result: BuilderResult, existing: OutfitView | null) => Promise<void>
}) {
  const owned = useMemo(() => items.filter(i => !i.is_incoming), [items])
  const [selected, setSelected] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [slot, setSlot] = useState<OutfitSlot>('custom')
  const [planDate, setPlanDate] = useState<string | null>(null)
  const [category, setCategory] = useState<ApparelCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected(outfit?.item_ids ?? [])
    setTitle(outfit?.title ?? '')
    setSlot(outfit?.slot ?? 'custom')
    setPlanDate(outfit ? outfit.plan_date : defaultDate)
    setCategory('all')
    setQuery('')
    setSaving(false)
  }, [open, outfit, defaultDate])

  const byId = useMemo(() => new Map(owned.map(i => [i.id, i])), [owned])
  const pieces = selected
    .map(id => byId.get(id))
    .filter((i): i is WardrobeItemView => !!i)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    owned.forEach(i => map.set(i.category, (map.get(i.category) ?? 0) + 1))
    return map
  }, [owned])
  const visible = owned.filter(i => {
    if (category !== 'all' && i.category !== category) return false
    if (!query.trim()) return true
    const hay = [i.name, i.color, i.brand, i.sub_type, ...i.style_tags].filter(Boolean).join(' ').toLowerCase()
    return query.toLowerCase().split(/\s+/).every(w => hay.includes(w))
  })
  const notes = hints(pieces, owned.some(i => i.category === 'eyewear'))

  function toggle(id: string) {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  async function save() {
    setSaving(true)
    try {
      await onSave({ item_ids: pieces.map(p => p.id), title: title.trim(), slot, plan_date: planDate }, outfit)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => !o && !saving && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          data-iven-theme={dark ? 'dark' : 'light'}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(1080px,96vw)] h-[min(820px,92vh)] rounded-2xl flex flex-col overflow-hidden"
          style={{ background: 'var(--iven-bg)', color: 'var(--iven-text)', border: '1px solid var(--iven-border)' }}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
            <div>
              <Dialog.Title className="font-playfair text-2xl font-bold">{outfit ? 'Edit outfit' : 'Build an outfit'}</Dialog.Title>
              <Dialog.Description className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>
                Tap pieces to add them. Claude writes the notes; the pieces stay exactly as you pick them.
              </Dialog.Description>
            </div>
            <button type="button" onClick={onClose} disabled={saving} aria-label="Close" style={{ color: 'var(--iven-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 min-h-0 grid md:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex flex-col min-h-0 px-5 pb-5">
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--iven-muted)' }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search your closet…"
                  className="w-full font-inter text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none"
                  style={inputStyle()}
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto iven-no-scrollbar mb-3 pb-1 shrink-0">
                <Chip active={category === 'all'} onClick={() => setCategory('all')} count={owned.length}>All</Chip>
                {APPAREL_CATEGORIES.filter(c => counts.get(c.value)).map(c => (
                  <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)} count={counts.get(c.value)}>
                    {c.label}
                  </Chip>
                ))}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  {visible.map(item => {
                    const on = selected.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item.id)}
                        className="relative text-left rounded-xl overflow-hidden"
                        style={{ border: on ? '2px solid var(--iven-accent)' : '1px solid var(--iven-grid)', background: 'var(--iven-surface)' }}
                        aria-pressed={on}
                      >
                        <ItemImage item={item} className="aspect-square" />
                        {on && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}>
                            <Check size={12} />
                          </span>
                        )}
                        <p className="font-inter text-[11px] leading-tight px-2 py-1.5 line-clamp-2" style={{ color: 'var(--iven-text)' }}>{item.name}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col min-h-0 border-t md:border-t-0 md:border-l px-5 py-4" style={{ borderColor: 'var(--iven-grid)', background: 'var(--iven-surface)' }}>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
                <div>
                  <SectionLabel>Your outfit · {pieces.length}</SectionLabel>
                  {pieces.length === 0 ? (
                    <p className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>Nothing picked yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {pieces.map(p => (
                        <li key={p.id} className="flex items-center gap-2 rounded-lg p-1.5" style={{ background: 'var(--iven-bg)' }}>
                          <ItemImage item={p} className="w-10 h-10 rounded-md shrink-0" />
                          <span className="flex-1 font-inter text-[13px] truncate">{p.name}</span>
                          <button type="button" onClick={() => toggle(p.id)} aria-label={`Remove ${p.name}`} style={{ color: 'var(--iven-muted)' }}>
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pieces.length > 0 && notes.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-0.5">
                      {notes.map(n => (
                        <li key={n} className="font-inter text-[11px]" style={{ color: n.startsWith('Your rule') ? '#B4452F' : 'var(--iven-muted)' }}>· {n}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <SectionLabel>Name</SectionLabel>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Leave blank and Claude names it"
                    className="w-full font-inter text-sm rounded-lg px-3 py-2 outline-none"
                    style={inputStyle()}
                  />
                </div>

                <div>
                  <SectionLabel>For</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {SLOTS.map(s => <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>{SLOT_LABELS[s]}</Chip>)}
                  </div>
                </div>

                <div>
                  <SectionLabel>Day</SectionLabel>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Chip active={planDate === null} onClick={() => setPlanDate(null)}>Library only</Chip>
                    <input
                      type="date"
                      value={planDate ?? ''}
                      onChange={e => setPlanDate(e.target.value || null)}
                      className="font-mono text-[11px] rounded-full px-3 py-1.5 outline-none"
                      style={inputStyle()}
                      aria-label="Plan for a day"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={save} disabled={saving || pieces.length < 2} className="py-3 mt-4 w-full">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Saving…' : pieces.length < 2 ? 'Pick at least 2 pieces' : outfit ? 'Save changes' : 'Save outfit'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
