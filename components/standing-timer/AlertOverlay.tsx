'use client'

import * as Dialog from '@radix-ui/react-dialog'
import {
  alertMessageForTransition,
  MODE_ICONS,
  MODE_LABELS,
} from '@/lib/standing-timer/cycle'
import type { IntervalCompleteAlert } from '@/types/standing-timer'

interface AlertOverlayProps {
  alert: IntervalCompleteAlert | null
  onDismiss: () => void
}

export default function AlertOverlay({ alert, onDismiss }: AlertOverlayProps) {
  if (!alert) return null

  const message = alertMessageForTransition(alert.completedMode, alert.nextMode)

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onDismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-beige border border-gold rounded-2xl p-6 z-[70] w-[min(90vw,360px)] shadow-xl">
          <Dialog.Title className="font-playfair text-2xl font-bold text-textPrimary mb-2">
            {MODE_ICONS[alert.completedMode]} {MODE_LABELS[alert.completedMode]} complete
          </Dialog.Title>
          <Dialog.Description className="text-textMuted font-inter text-sm leading-relaxed mb-6">
            {message}
            <span className="block mt-2 text-textPrimary">
              Up next: {MODE_LABELS[alert.nextMode]} · {alert.nextDurationMinutes}m
            </span>
          </Dialog.Description>
          <button
            onClick={onDismiss}
            className="w-full py-3 bg-gold text-white rounded-xl font-inter font-medium hover:bg-brownAccent transition-colors"
          >
            Got it
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
