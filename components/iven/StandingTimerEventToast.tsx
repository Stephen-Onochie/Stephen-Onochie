'use client'

import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { MODE_ICONS, MODE_LABELS } from '@/lib/standing-timer/cycle'
import { useStandingTimerEventToast } from '@/hooks/useStandingTimerEventToast'

export default function StandingTimerEventToast() {
  const { toast, dismiss } = useStandingTimerEventToast()
  const pathname = usePathname()

  // The Standing Timer page has its own full-screen AlertOverlay, so suppress
  // the ambient toast there to avoid showing two notifications at once.
  const onTimerPage = pathname?.startsWith('/apps/standing-timer')

  if (onTimerPage || !toast) return null

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-[100] w-[min(92vw,320px)] animate-[iven-toast-in_0.25s_ease-out] rounded-2xl border shadow-xl"
      style={{
        background: 'var(--iven-surface)',
        borderColor: 'var(--iven-border)',
        color: 'var(--iven-text)',
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <span className="text-2xl leading-none" aria-hidden>
          {MODE_ICONS[toast.nextMode]}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="font-mono text-[10px] uppercase tracking-[1.5px]"
            style={{ color: 'var(--iven-muted)' }}
          >
            Standing Timer
          </p>
          <p className="mt-1 font-inter text-sm leading-snug">{toast.message}</p>
          <p className="mt-1.5 font-inter text-sm font-semibold" style={{ color: 'var(--iven-accent)' }}>
            Up next: {MODE_LABELS[toast.nextMode]}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 rounded-lg p-1 transition-opacity hover:opacity-70"
          style={{ color: 'var(--iven-muted)' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
