'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Bubble, BubbleType } from '@/types/bubbles'

const typeConfig: Record<BubbleType, { icon: string; label: string; color: string }> = {
  idea: { icon: '💡', label: 'Idea', color: 'bg-yellow-100 text-yellow-800' },
  purchase: { icon: '🛒', label: 'Purchase', color: 'bg-blue-100 text-blue-800' },
  goal: { icon: '🎯', label: 'Goal', color: 'bg-green-100 text-green-800' },
  question: { icon: '❓', label: 'Question', color: 'bg-purple-100 text-purple-800' },
}

function formatCountdown(expiresAt: string): string {
  const now = Date.now()
  const exp = new Date(expiresAt).getTime()
  const diff = exp - now

  if (diff <= 0) return 'Expired'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getOpacity(expiresAt: string): string {
  const now = Date.now()
  const exp = new Date(expiresAt).getTime()
  const diff = exp - now
  const hours = diff / (1000 * 60 * 60)

  if (hours > 48) return 'opacity-100'
  if (hours > 24) return 'opacity-70'
  return 'opacity-50'
}

interface BubbleCardProps {
  bubble: Bubble
  view: 'active' | 'saved' | 'graveyard'
  onSave?: (id: string) => void
  onDelete: (id: string) => void
  onUnsave?: (id: string) => void
  onRescue?: (id: string) => void
}

export default function BubbleCard({ bubble, view, onSave, onDelete, onUnsave, onRescue }: BubbleCardProps) {
  const [countdown, setCountdown] = useState(() => formatCountdown(bubble.expires_at))
  const [deleteOpen, setDeleteOpen] = useState(false)
  const config = typeConfig[bubble.type]

  useEffect(() => {
    if (view !== 'active') return
    const interval = setInterval(() => {
      setCountdown(formatCountdown(bubble.expires_at))
    }, 60000)
    return () => clearInterval(interval)
  }, [bubble.expires_at, view])

  const isGraveyard = view === 'graveyard'
  const opacityClass = view === 'active' ? getOpacity(bubble.expires_at) : 'opacity-100'

  return (
    <div
      className={`bg-surface border rounded-2xl p-5 transition-all duration-200 ${opacityClass} ${
        isGraveyard
          ? 'border-textMuted grayscale'
          : 'border-goldLight hover:border-gold hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className={`font-inter font-semibold text-base leading-snug flex-1 ${isGraveyard ? 'text-textMuted line-through' : 'text-textPrimary'}`}>
          {bubble.title}
        </h3>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${config.color}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {bubble.body && (
        <p className="text-textMuted text-sm leading-relaxed mb-3 line-clamp-2">
          {bubble.body}
        </p>
      )}

      {view === 'active' && (
        <p className="text-xs text-textMuted font-inter mb-4">
          ⏱ expires in {countdown}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {view === 'active' && onSave && (
          <button
            onClick={() => onSave(bubble.id)}
            className="flex-1 min-h-[40px] px-3 py-2 bg-gold text-white text-sm font-inter font-medium rounded-lg hover:bg-brownAccent transition-colors"
          >
            Save
          </button>
        )}
        {view === 'saved' && onUnsave && (
          <button
            onClick={() => onUnsave(bubble.id)}
            className="flex-1 min-h-[40px] px-3 py-2 border border-gold text-gold text-sm font-inter font-medium rounded-lg hover:bg-surface transition-colors"
          >
            Unsave
          </button>
        )}
        {view === 'graveyard' && onRescue && (
          <button
            onClick={() => onRescue(bubble.id)}
            className="flex-1 min-h-[40px] px-3 py-2 bg-gold text-white text-sm font-inter font-medium rounded-lg hover:bg-brownAccent transition-colors"
          >
            Rescue
          </button>
        )}
        <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="min-h-[40px] px-3 py-2 border border-red-200 text-red-400 text-sm font-inter font-medium rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-beige rounded-2xl p-6 z-50 shadow-lg border border-goldLight">
              <Dialog.Title className="font-playfair text-xl font-bold text-textPrimary mb-2">
                Delete bubble?
              </Dialog.Title>
              <Dialog.Description className="font-inter text-sm text-textMuted leading-relaxed mb-6">
                &ldquo;{bubble.title}&rdquo; will be permanently deleted. This cannot be undone.
              </Dialog.Description>
              <div className="flex gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="flex-1 min-h-[44px] px-4 py-2 border border-gold text-gold text-sm font-inter font-medium rounded-lg hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(bubble.id)
                    setDeleteOpen(false)
                  }}
                  className="flex-1 min-h-[44px] px-4 py-2 bg-red-500 text-white text-sm font-inter font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  )
}
