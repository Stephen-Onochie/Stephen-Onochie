'use client'

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import type { RemoteAction } from '@/types/lg-remote'

interface DPadProps {
  onPress: (action: RemoteAction) => void
  disabled?: boolean
}

export default function DPad({ onPress, disabled }: DPadProps) {
  const arrow =
    'flex items-center justify-center text-textPrimary transition-colors hover:text-brownAccent disabled:opacity-40 disabled:cursor-not-allowed active:scale-90'

  return (
    <div className="relative mx-auto h-52 w-52 rounded-full bg-surface border border-goldLight">
      <button
        type="button"
        aria-label="Up"
        disabled={disabled}
        onClick={() => onPress('up')}
        className={`absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 ${arrow}`}
      >
        <ChevronUp size={28} />
      </button>
      <button
        type="button"
        aria-label="Left"
        disabled={disabled}
        onClick={() => onPress('left')}
        className={`absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 ${arrow}`}
      >
        <ChevronLeft size={28} />
      </button>
      <button
        type="button"
        aria-label="OK"
        disabled={disabled}
        onClick={() => onPress('ok')}
        className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold text-beige font-inter font-semibold transition-all hover:bg-goldLight active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        OK
      </button>
      <button
        type="button"
        aria-label="Right"
        disabled={disabled}
        onClick={() => onPress('right')}
        className={`absolute right-0 top-1/2 h-16 w-16 -translate-y-1/2 ${arrow}`}
      >
        <ChevronRight size={28} />
      </button>
      <button
        type="button"
        aria-label="Down"
        disabled={disabled}
        onClick={() => onPress('down')}
        className={`absolute bottom-0 left-1/2 h-16 w-16 -translate-x-1/2 ${arrow}`}
      >
        <ChevronDown size={28} />
      </button>
    </div>
  )
}
