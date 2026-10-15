'use client'

import { useEffect, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Info, Play, Shuffle, X } from 'lucide-react'
import { KIND_LABELS, type WatchItem, type WatchKind } from '@/types/watchlist'
import { Chip, formatRuntime, Poster, SectionLabel } from './shared'

const RUNTIME_LIMITS: { label: string; max: number | null }[] = [
  { label: 'Any length', max: null },
  { label: '≤ 30m', max: 30 },
  { label: '≤ 90m', max: 90 },
  { label: '≤ 2h', max: 120 },
  { label: '≤ 2.5h', max: 150 },
]

// For shows the limit applies to episode length, since that's the sitting.
function fitsRuntime(item: WatchItem, max: number | null) {
  if (max == null) return true
  const minutes = item.details?.runtimeMinutes
  return minutes != null && minutes <= max
}

export default function PickForMe({
  open,
  dark,
  items,
  onOpenChange,
  onStart,
  onShowDetails,
}: {
  open: boolean
  dark: boolean
  items: WatchItem[]
  onOpenChange: (open: boolean) => void
  onStart: (item: WatchItem) => Promise<void>
  onShowDetails: (item: WatchItem) => void
}) {
  const [kind, setKind] = useState<WatchKind | 'all'>('all')
  const [runtimeMax, setRuntimeMax] = useState<number | null>(null)
  const [pickId, setPickId] = useState<string | null>(null)

  const pool = useMemo(
    () => items.filter(i => i.status === 'watchlist' && (kind === 'all' || i.kind === kind) && fitsRuntime(i, runtimeMax)),
    [items, kind, runtimeMax]
  )

  function roll(exclude?: string | null) {
    const options = pool.length > 1 ? pool.filter(i => i.id !== exclude) : pool
    setPickId(options.length ? options[Math.floor(Math.random() * options.length)].id : null)
  }

  // Re-roll when the dialog opens or a filter changes, not on every list update.
  useEffect(() => {
    if (open) roll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, runtimeMax])

  const pick = pool.find(i => i.id === pickId) ?? null
  const kindsPresent = Array.from(new Set(items.filter(i => i.status === 'watchlist').map(i => i.kind)))

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          data-iven-theme={dark ? 'dark' : 'light'}
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[min(94vw,560px)] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 outline-none"
          style={{ background: 'var(--iven-bg)', color: 'var(--iven-text)', border: '1px solid var(--iven-grid)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="font-playfair font-bold text-[26px] m-0">Pick for me</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" style={{ color: 'var(--iven-muted)' }}><X size={18} /></button>
            </Dialog.Close>
          </div>

          <SectionLabel>Type</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Chip active={kind === 'all'} onClick={() => setKind('all')}>All</Chip>
            {kindsPresent.map(k => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{KIND_LABELS[k]}</Chip>
            ))}
          </div>

          <SectionLabel>Time you have</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-6">
            {RUNTIME_LIMITS.map(r => (
              <Chip key={r.label} active={runtimeMax === r.max} onClick={() => setRuntimeMax(r.max)}>{r.label}</Chip>
            ))}
          </div>

          {pick ? (
            <div className="rounded-xl p-4 flex gap-4" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}>
              <Poster url={pick.poster_url} title={pick.title} className="w-[96px] flex-shrink-0 rounded-lg" />
              <div className="min-w-0 flex flex-col">
                <div className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--iven-accent)' }}>
                  {KIND_LABELS[pick.kind]}
                </div>
                <div className="font-playfair font-bold text-[20px] leading-tight mt-1">{pick.title}</div>
                <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--iven-muted)' }}>
                  {[
                    pick.year,
                    formatRuntime(pick.details?.runtimeMinutes),
                    pick.details?.genres.slice(0, 2).join(', '),
                  ].filter(Boolean).join(' · ')}
                </div>
                {pick.details?.overview && (
                  <p className="font-inter text-[12px] leading-relaxed mt-2 line-clamp-4" style={{ color: 'var(--iven-text)' }}>
                    {pick.details.overview}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-6 text-center font-inter text-[13px]" style={{ background: 'var(--iven-surface)', color: 'var(--iven-muted)' }}>
              Nothing on your watchlist fits those filters.
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => roll(pickId)}
              disabled={pool.length < 2}
              className="flex-1 flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] py-2.5 rounded-lg disabled:opacity-50"
              style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
            >
              <Shuffle size={13} /> Another
            </button>
            <button
              onClick={() => pick && onShowDetails(pick)}
              disabled={!pick}
              className="flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] px-4 py-2.5 rounded-lg disabled:opacity-50"
              style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
            >
              <Info size={13} /> Details
            </button>
            <button
              onClick={() => pick && onStart(pick)}
              disabled={!pick}
              className="flex-1 flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-[1.5px] py-2.5 rounded-lg disabled:opacity-50"
              style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}
            >
              <Play size={13} /> Start watching
            </button>
          </div>
          <div className="font-mono text-[10px] mt-3 text-center" style={{ color: 'var(--iven-muted)' }}>
            {pool.length} on your watchlist match
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
