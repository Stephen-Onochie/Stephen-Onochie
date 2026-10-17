'use client'

import { Shirt } from 'lucide-react'
import type { WardrobeItemView } from '@/types/stylemate'

export function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
      style={
        active
          ? { background: 'var(--iven-accent)', color: '#2C1F0E', border: '1px solid var(--iven-accent)' }
          : { color: 'var(--iven-muted)', border: '1px solid var(--iven-grid)' }
      }
    >
      {children}
      {count != null && <span style={{ opacity: 0.7 }}>{count}</span>}
    </button>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[2px] mb-2.5" style={{ color: 'var(--iven-accent)' }}>
      {children}
    </div>
  )
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  type = 'button',
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  className?: string
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--iven-accent)', color: '#2C1F0E', border: '1px solid var(--iven-accent)' },
    ghost: { background: 'transparent', color: 'var(--iven-text)', border: '1px solid var(--iven-grid)' },
    danger: { background: 'transparent', color: '#B4452F', border: '1px solid #B4452F' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[1.5px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-50 ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  )
}

/** Best available picture for a piece: the clean AI render, else the raw photo. */
export function ItemImage({
  item,
  preferPhoto = false,
  className = '',
}: {
  item: Pick<WardrobeItemView, 'name' | 'render_url' | 'photo_url' | 'color_hex' | 'render_status'>
  preferPhoto?: boolean
  className?: string
}) {
  const url = preferPhoto ? item.photo_url ?? item.render_url : item.render_url ?? item.photo_url
  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${className}`}
      style={{ background: url ? '#F5F0E8' : 'var(--iven-surface)' }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.name} loading="lazy" className="absolute inset-0 w-full h-full object-contain" />
      ) : (
        <Shirt size={22} style={{ color: item.color_hex ?? 'var(--iven-muted)' }} />
      )}
    </div>
  )
}

export function inputStyle(): React.CSSProperties {
  return {
    background: 'var(--iven-bg)',
    color: 'var(--iven-text)',
    border: '1px solid var(--iven-grid)',
  }
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl font-inter text-sm shadow-lg max-w-[90vw]"
      style={{ background: 'var(--iven-text)', color: 'var(--iven-bg)', animation: 'iven-toast-in 0.2s ease-out' }}
    >
      {message}
    </div>
  )
}
