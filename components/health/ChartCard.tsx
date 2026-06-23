'use client'

import type { ReactNode } from 'react'

interface ChartCardProps {
  eyebrow: string
  title: string
  headlineValue?: string
  headlineCaption?: string
  footerLeft?: ReactNode
  footerRight?: ReactNode
  fullWidth?: boolean
  children: ReactNode
}

// Shared chrome for every health chart — matches the prototype's editorial card
// (eyebrow + Playfair title + headline value, divider, plot, footer row) but
// styled entirely with --iven-* tokens so it respects dark/light mode.
export default function ChartCard({
  eyebrow,
  title,
  headlineValue,
  headlineCaption,
  footerLeft,
  footerRight,
  fullWidth,
  children,
}: ChartCardProps) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col"
      style={{
        background: 'var(--iven-surface)',
        border: '1px solid var(--iven-border)',
        gridColumn: fullWidth ? '1 / -1' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className="font-mono text-[10px] font-semibold tracking-[2.6px] uppercase"
            style={{ color: 'var(--iven-muted)' }}
          >
            {eyebrow}
          </div>
          <h3
            className="font-playfair font-bold text-2xl mt-1.5 m-0"
            style={{ color: 'var(--iven-text)' }}
          >
            {title}
          </h3>
        </div>
        {headlineValue !== undefined && (
          <div className="text-right shrink-0">
            <div className="font-inter font-extrabold text-[22px]" style={{ color: 'var(--iven-text)' }}>
              {headlineValue}
            </div>
            {headlineCaption && (
              <div className="font-mono text-[10px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
                {headlineCaption}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-px mt-[18px]" style={{ background: 'var(--iven-grid)' }} />

      <div className="mt-[18px] flex-1">{children}</div>

      {(footerLeft || footerRight) && (
        <div
          className="flex justify-between items-center mt-3.5 font-mono text-[10px] tracking-[0.08em]"
          style={{ color: 'var(--iven-muted)' }}
        >
          <span>{footerLeft}</span>
          <span>{footerRight}</span>
        </div>
      )}
    </div>
  )
}
