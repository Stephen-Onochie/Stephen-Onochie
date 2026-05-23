'use client'

import { useState } from 'react'
import { BubbleType } from '@/types/bubbles'

const bubbleTypes: { value: BubbleType; label: string; icon: string }[] = [
  { value: 'idea', label: 'Idea', icon: '💡' },
  { value: 'purchase', label: 'Purchase', icon: '🛒' },
  { value: 'goal', label: 'Goal', icon: '🎯' },
  { value: 'question', label: 'Question', icon: '❓' },
]

const expiryOptions = [
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
  { value: 168, label: '7 days' },
]

interface BubbleFormProps {
  onSubmit: (data: { title: string; body: string; type: BubbleType; expiryHours: number }) => Promise<void>
  onCancel: () => void
}

export default function BubbleForm({ onSubmit, onCancel }: BubbleFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<BubbleType>('idea')
  const [expiryHours, setExpiryHours] = useState(72)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await onSubmit({ title: title.trim(), body: body.trim(), type, expiryHours })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          required
          className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter placeholder:text-textMuted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold min-h-[44px]"
        />
      </div>

      <div>
        <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">
          Details (optional)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add any context..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter placeholder:text-textMuted focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-inter font-medium text-textPrimary mb-2">
          Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {bubbleTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-inter text-sm font-medium transition-colors min-h-[44px] ${
                type === t.value
                  ? 'border-gold bg-gold text-white'
                  : 'border-goldLight bg-beige text-textMuted hover:border-gold'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-inter font-medium text-textPrimary mb-1.5">
          Expires in
        </label>
        <select
          value={expiryHours}
          onChange={(e) => setExpiryHours(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-xl border border-goldLight bg-beige text-textPrimary font-inter focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold min-h-[44px]"
        >
          {expiryOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[48px] border border-goldLight text-textMuted font-inter font-medium rounded-xl hover:border-gold hover:text-textPrimary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex-1 min-h-[48px] bg-gold text-white font-inter font-semibold rounded-xl hover:bg-brownAccent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Add Bubble'}
        </button>
      </div>
    </form>
  )
}
