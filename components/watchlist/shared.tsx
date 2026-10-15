'use client'

import { Film } from 'lucide-react'

export function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

export function Poster({ url, title, className = '' }: { url: string | null; title: string; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${className}`}
      style={{ background: 'var(--iven-surface)', aspectRatio: '2 / 3' }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2 px-3 text-center">
          <Film size={20} style={{ color: 'var(--iven-muted)' }} />
          <span className="font-playfair text-[13px] font-bold leading-tight" style={{ color: 'var(--iven-text)' }}>
            {title}
          </span>
        </div>
      )}
    </div>
  )
}

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
      onClick={onClick}
      className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] px-3 py-1.5 rounded-full transition-colors"
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

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--iven-grid)' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: 'var(--iven-accent)' }} />
    </div>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[2px] mb-2.5" style={{ color: 'var(--iven-accent)' }}>
      {children}
    </div>
  )
}
