'use client'

import { Bubble } from '@/types/bubbles'
import BubbleCard from './BubbleCard'

interface BubbleListProps {
  bubbles: Bubble[]
  view: 'active' | 'saved' | 'graveyard'
  onSave?: (id: string) => void
  onDelete: (id: string) => void
  onUnsave?: (id: string) => void
  onRescue?: (id: string) => void
  emptyMessage?: string
  emptyIcon?: string
}

export default function BubbleList({
  bubbles,
  view,
  onSave,
  onDelete,
  onUnsave,
  onRescue,
  emptyMessage,
  emptyIcon,
}: BubbleListProps) {
  if (bubbles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {emptyIcon && <p className="text-4xl mb-3">{emptyIcon}</p>}
        {emptyMessage && (
          <p className="text-textMuted font-inter text-sm">{emptyMessage}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {bubbles.map((bubble) => (
        <BubbleCard
          key={bubble.id}
          bubble={bubble}
          view={view}
          onSave={onSave}
          onDelete={onDelete}
          onUnsave={onUnsave}
          onRescue={onRescue}
        />
      ))}
    </div>
  )
}
