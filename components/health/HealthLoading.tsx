import { Loader2 } from 'lucide-react'

// Branded loading state for the Health dashboard: a spinner + an indeterminate
// gold sweep bar (honest — the fetch isn't streamed, so no fake %), plus skeleton
// placeholders shaped like the summary cards and charts so the layout doesn't jump.
export default function HealthLoading() {
  return (
    <div className="flex flex-col gap-[18px]">
      {/* Status row + indeterminate bar */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--iven-accent)' }} />
          <span className="font-mono text-xs tracking-[1.5px] uppercase" style={{ color: 'var(--iven-muted)' }}>
            Loading health data…
          </span>
        </div>
        <div className="iven-indeterminate-track h-1.5 rounded-full" />
      </div>

      {/* Summary cards skeleton (4 across) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[18px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl h-24 animate-pulse"
            style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
          />
        ))}
      </div>

      {/* Chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
        <div
          className="rounded-2xl h-64 lg:col-span-2 animate-pulse"
          style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
        />
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl h-56 animate-pulse"
            style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
          />
        ))}
      </div>
    </div>
  )
}
