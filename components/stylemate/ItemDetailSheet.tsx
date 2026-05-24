'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import {
  APPAREL_CATEGORIES,
  ARCHETYPES,
  LAUNDRY_STATUSES,
} from '@/lib/stylemate/constants'
import type { ApparelCategory, LaundryStatus, WardrobeItemWithSignedUrl } from '@/types/stylemate'

interface ItemDetailSheetProps {
  item: WardrobeItemWithSignedUrl | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    id: string,
    patch: {
      name: string
      category: ApparelCategory
      sub_type: string | null
      color: string
      min_temp_threshold: number
      max_temp_threshold: number
      archetype: string
      status: LaundryStatus
    }
  ) => Promise<void>
  onDelete: (id: string, imagePath: string | null) => Promise<void>
}

export default function ItemDetailSheet({
  item,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: ItemDetailSheetProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ApparelCategory>('top')
  const [subType, setSubType] = useState('')
  const [color, setColor] = useState('')
  const [minTemp, setMinTemp] = useState(0)
  const [maxTemp, setMaxTemp] = useState(110)
  const [archetype, setArchetype] = useState('casual_weekend')
  const [status, setStatus] = useState<LaundryStatus>('clean')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!item) return
    setName(item.name)
    setCategory(item.category)
    setSubType(item.sub_type ?? '')
    setColor(item.color)
    setMinTemp(item.min_temp_threshold)
    setMaxTemp(item.max_temp_threshold)
    setArchetype(item.archetype)
    setStatus(item.status)
  }, [item])

  if (!item) return null

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(item!.id, {
        name: name.trim(),
        category,
        sub_type: subType.trim() || null,
        color: color.trim(),
        min_temp_threshold: minTemp,
        max_temp_threshold: maxTemp,
        archetype,
        status,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this item from your closet?')) return
    setDeleting(true)
    try {
      await onDelete(item!.id, item!.image_url)
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed bottom-0 left-0 right-0 bg-beige rounded-t-3xl p-6 z-50 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="font-playfair text-2xl font-bold text-textPrimary mb-4">
            Edit item
          </Dialog.Title>

          {item.signed_image_url && (
            <div className="aspect-video rounded-xl overflow-hidden bg-surface border border-goldLight mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.signed_image_url} alt={item.name} className="w-full h-full object-contain" />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige font-inter min-h-[44px]"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ApparelCategory)}
              className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige font-inter min-h-[44px]"
            >
              {APPAREL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              placeholder="Sub-type"
              className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige font-inter min-h-[44px]"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Color"
              className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige font-inter min-h-[44px]"
            />
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige font-inter min-h-[44px]"
            >
              {ARCHETYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={minTemp}
                onChange={(e) => setMinTemp(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige font-inter min-h-[44px]"
                aria-label="Min temp"
              />
              <input
                type="number"
                value={maxTemp}
                onChange={(e) => setMaxTemp(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige font-inter min-h-[44px]"
                aria-label="Max temp"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LaundryStatus)}
              className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige font-inter min-h-[44px]"
            >
              {LAUNDRY_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="w-full min-h-[48px] bg-gold text-white font-inter font-semibold rounded-xl hover:bg-brownAccent disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full min-h-[48px] border border-goldLight text-brownAccent font-inter font-medium rounded-xl hover:border-gold disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete item'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
