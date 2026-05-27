'use client'

import { useState } from 'react'

const EMOJI_CHOICES = ['🗂️', '💼', '🏠', '🛒', '💡', '🏋️', '✈️', '📚', '🎯', '🔧']

interface NewListFormProps {
  onCreate: (name: string, emoji: string) => void | Promise<void>
  onCancel: () => void
}

export default function NewListForm({ onCreate, onCancel }: NewListFormProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0])
  const [saving, setSaving] = useState(false)

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    await onCreate(trimmed, emoji)
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-2 block font-inter text-xs font-medium text-textMuted">
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`h-10 w-10 rounded-xl text-xl transition-colors ${
                emoji === e ? 'bg-gold/30 ring-2 ring-gold' : 'bg-surface hover:bg-gold/10'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-inter text-xs font-medium text-textMuted">
          List name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="e.g. Groceries, Work, Errands"
          className="w-full rounded-xl border border-goldLight bg-surface px-4 py-3 font-inter text-textPrimary outline-none focus:border-gold"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-goldLight py-3 font-inter text-sm text-textMuted hover:text-textPrimary"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          className="flex-1 rounded-xl bg-gold py-3 font-inter text-sm font-medium text-white transition-colors hover:bg-brownAccent disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create list'}
        </button>
      </div>
    </div>
  )
}
