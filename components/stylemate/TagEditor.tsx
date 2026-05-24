'use client'

import { useState } from 'react'
import {
  APPAREL_CATEGORIES,
  ARCHETYPES,
  LAUNDRY_STATUSES,
} from '@/lib/stylemate/constants'
import type { ApparelCategory, GeminiTagResult, LaundryStatus } from '@/types/stylemate'

export interface TagEditorValues {
  name: string
  category: ApparelCategory
  sub_type: string
  color: string
  min_temp_threshold: number
  max_temp_threshold: number
  archetype: string
  status: LaundryStatus
}

interface TagEditorProps {
  initial: GeminiTagResult
  previewUrl: string
  saving: boolean
  onSave: (values: TagEditorValues) => Promise<void>
  onCancel: () => void
}

export function tagsToEditorValues(tags: GeminiTagResult): TagEditorValues {
  return {
    name: tags.name,
    category: tags.category,
    sub_type: tags.sub_type,
    color: tags.color,
    min_temp_threshold: tags.min_temp_threshold,
    max_temp_threshold: tags.max_temp_threshold,
    archetype: tags.archetype,
    status: 'clean',
  }
}

export default function TagEditor({
  initial,
  previewUrl,
  saving,
  onSave,
  onCancel,
}: TagEditorProps) {
  const [values, setValues] = useState<TagEditorValues>(() => tagsToEditorValues(initial))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim()) return
    await onSave(values)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="aspect-video rounded-xl overflow-hidden bg-surface border border-goldLight">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
      </div>

      <div>
        <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">Name</label>
        <input
          type="text"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
          className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter focus:outline-none focus:border-gold min-h-[44px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">Category</label>
          <select
            value={values.category}
            onChange={(e) =>
              setValues((v) => ({ ...v, category: e.target.value as ApparelCategory }))
            }
            className="w-full px-3 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter text-sm focus:outline-none focus:border-gold min-h-[44px]"
          >
            {APPAREL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">Archetype</label>
          <select
            value={values.archetype}
            onChange={(e) => setValues((v) => ({ ...v, archetype: e.target.value }))}
            className="w-full px-3 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter text-sm focus:outline-none focus:border-gold min-h-[44px]"
          >
            {ARCHETYPES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">Sub-type</label>
        <input
          type="text"
          value={values.sub_type}
          onChange={(e) => setValues((v) => ({ ...v, sub_type: e.target.value }))}
          placeholder="e.g. hoodie, jeans"
          className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter focus:outline-none focus:border-gold min-h-[44px]"
        />
      </div>

      <div>
        <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">Color</label>
        <input
          type="text"
          value={values.color}
          onChange={(e) => setValues((v) => ({ ...v, color: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter focus:outline-none focus:border-gold min-h-[44px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">Min temp (°F)</label>
          <input
            type="number"
            value={values.min_temp_threshold}
            onChange={(e) =>
              setValues((v) => ({ ...v, min_temp_threshold: Number(e.target.value) }))
            }
            className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter focus:outline-none focus:border-gold min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">Max temp (°F)</label>
          <input
            type="number"
            value={values.max_temp_threshold}
            onChange={(e) =>
              setValues((v) => ({ ...v, max_temp_threshold: Number(e.target.value) }))
            }
            className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter focus:outline-none focus:border-gold min-h-[44px]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">Laundry status</label>
        <select
          value={values.status}
          onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as LaundryStatus }))}
          className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter focus:outline-none focus:border-gold min-h-[44px]"
        >
          {LAUNDRY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 min-h-[48px] border border-goldLight text-textMuted font-inter font-medium rounded-xl hover:border-gold transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !values.name.trim()}
          className="flex-1 min-h-[48px] bg-gold text-white font-inter font-semibold rounded-xl hover:bg-brownAccent transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save to closet'}
        </button>
      </div>
    </form>
  )
}
