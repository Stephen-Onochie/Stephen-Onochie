'use client'

export interface RankedItem {
  key: string
  label: string
  value: number
  detail?: string
}

// Horizontal-bar leaderboard: each row's bar is scaled to the top row.
export default function RankedList({ items, emptyLabel }: { items: RankedItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return (
      <div className="font-mono text-[11px] py-6 text-center" style={{ color: 'var(--iven-muted)' }}>
        {emptyLabel}
      </div>
    )
  }
  const max = Math.max(...items.map(item => item.value), 1)
  return (
    <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
      {items.map(item => (
        <li key={item.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-inter text-[13px] truncate" style={{ color: 'var(--iven-text)' }} title={item.label}>
              {item.label}
            </span>
            <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--iven-muted)' }}>
              {item.detail && <span className="mr-2">{item.detail}</span>}
              <span className="font-semibold" style={{ color: 'var(--iven-text)' }}>
                {item.value.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--iven-grid) 35%, transparent)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(3, (item.value / max) * 100)}%`, background: 'var(--iven-accent)' }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
