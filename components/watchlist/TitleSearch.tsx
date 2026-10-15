'use client'

import { useEffect, useRef, useState } from 'react'
import { Film, Loader2, Plus, Play, Search } from 'lucide-react'
import { searchWatchTitles } from '@/lib/watchlist/supabase'
import { KIND_LABELS, type WatchSearchResult, type WatchStatus } from '@/types/watchlist'

interface TitleSearchProps {
  placeholder: string
  autoFocus?: boolean
  initialQuery?: string
  onPick: (result: WatchSearchResult, status: WatchStatus) => Promise<void> | void
  // Offered when nothing matches (or always, as the last row) in add mode.
  onAddTitleOnly?: (title: string) => Promise<void> | void
  showWatchingAction?: boolean
}

export default function TitleSearch({
  placeholder,
  autoFocus,
  initialQuery = '',
  onPick,
  onAddTitleOnly,
  showWatchingAction,
}: TitleSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<WatchSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Enter pressed before results arrived: honour it once they land, so typing a
  // title and hitting Enter straight away still adds the top match.
  const pendingEnterRef = useRef(false)
  const queryRef = useRef(query)
  queryRef.current = query
  const commitRef = useRef<(results: WatchSearchResult[]) => void>(() => {})

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      setError('')
      return
    }
    const controller = new AbortController()
    setSearching(true)
    const timer = window.setTimeout(() => {
      searchWatchTitles(q, controller.signal)
        .then(r => {
          setResults(r)
          setError('')
          setHighlight(0)
          if (pendingEnterRef.current) {
            pendingEnterRef.current = false
            commitRef.current(r)
          }
        })
        .catch(err => {
          if (controller.signal.aborted) return
          pendingEnterRef.current = false
          setResults([])
          setError(err instanceof Error ? err.message : 'Search failed')
        })
        .finally(() => { if (!controller.signal.aborted) setSearching(false) })
    }, 280)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const q = query.trim()
  const titleOnlyIndex = onAddTitleOnly && q && !searching ? results.length : -1
  const rowCount = results.length + (titleOnlyIndex >= 0 ? 1 : 0)

  async function run(action: () => Promise<void> | void) {
    if (busy) return
    setBusy(true)
    const committed = query
    try {
      await action()
      // Only clear if the input still holds what was added; the user may have
      // already started typing the next title while the save was in flight.
      if (queryRef.current === committed) {
        setQuery('')
        setResults([])
        setOpen(false)
      }
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  function choose(index: number, status: WatchStatus = 'watchlist') {
    if (index === titleOnlyIndex && onAddTitleOnly) return run(() => onAddTitleOnly(q))
    const result = results[index]
    if (result) return run(() => onPick(result, status))
  }

  commitRef.current = (fresh: WatchSearchResult[]) => {
    if (fresh[0]) run(() => onPick(fresh[0], 'watchlist'))
    else if (onAddTitleOnly && q) run(() => onAddTitleOnly(q))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight(h => Math.min(h + 1, rowCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (!q) return
      if (searching) {
        pendingEnterRef.current = true
        return
      }
      choose(rowCount ? highlight : titleOnlyIndex)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && q.length >= 2

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        className="flex items-center gap-2.5 rounded-xl px-4 py-3"
        style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}
      >
        {searching || busy ? (
          <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: 'var(--iven-accent)' }} />
        ) : (
          <Search size={16} className="flex-shrink-0" style={{ color: 'var(--iven-muted)' }} />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[14px] font-inter min-w-0"
          style={{ color: 'var(--iven-text)' }}
        />
        <kbd
          className="hidden sm:block font-mono text-[10px] px-1.5 py-0.5 rounded"
          style={{ color: 'var(--iven-muted)', border: '1px solid var(--iven-grid)' }}
        >
          ENTER
        </kbd>
      </div>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full mt-2 rounded-xl overflow-hidden z-40 shadow-xl"
          style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-grid)' }}
        >
          {error && (
            <div className="px-4 py-3 text-[13px] font-inter" style={{ color: '#B4533A' }}>{error}</div>
          )}
          {searching && results.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-[13px] font-inter" style={{ color: 'var(--iven-muted)' }}>
              <Loader2 size={13} className="animate-spin" /> Searching TMDB…
            </div>
          )}
          {!error && !searching && results.length === 0 && (
            <div className="px-4 py-3 text-[13px] font-inter" style={{ color: 'var(--iven-muted)' }}>
              No matches on TMDB.
            </div>
          )}
          <div className="max-h-[420px] overflow-y-auto">
            {results.map((r, i) => (
              <div
                key={`${r.type}-${r.tmdbId}`}
                role="button"
                tabIndex={-1}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(i)}
                className="group flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                style={{ background: highlight === i ? 'var(--iven-surface)' : 'transparent' }}
              >
                <div
                  className="w-10 h-[60px] flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
                  style={{ background: 'var(--iven-surface)' }}
                >
                  {r.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.posterUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Film size={14} style={{ color: 'var(--iven-muted)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-inter text-[14px] font-medium truncate" style={{ color: 'var(--iven-text)' }}>
                    {r.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: 'var(--iven-accent)' }}>
                      {KIND_LABELS[r.suggestedKind]}
                    </span>
                    {r.year && (
                      <span className="font-mono text-[11px]" style={{ color: 'var(--iven-muted)' }}>{r.year}</span>
                    )}
                    {r.originalTitle && (
                      <span className="font-inter text-[11px] truncate" style={{ color: 'var(--iven-muted)' }}>
                        {r.originalTitle}
                      </span>
                    )}
                  </div>
                </div>
                {showWatchingAction && (
                  <button
                    onClick={e => { e.stopPropagation(); choose(i, 'watching') }}
                    className="hidden group-hover:flex items-center gap-1 font-mono text-[10px] uppercase tracking-[1px] px-2 py-1 rounded-md"
                    style={{ color: 'var(--iven-muted)', border: '1px solid var(--iven-grid)' }}
                    title="Add as Watching"
                  >
                    <Play size={10} /> Watching
                  </button>
                )}
                <Plus size={16} className="flex-shrink-0" style={{ color: highlight === i ? 'var(--iven-accent)' : 'var(--iven-muted)' }} />
              </div>
            ))}
            {titleOnlyIndex >= 0 && (
              <div
                role="button"
                tabIndex={-1}
                onMouseEnter={() => setHighlight(titleOnlyIndex)}
                onClick={() => choose(titleOnlyIndex)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer text-[13px] font-inter"
                style={{
                  background: highlight === titleOnlyIndex ? 'var(--iven-surface)' : 'transparent',
                  borderTop: results.length ? '1px solid var(--iven-grid)' : undefined,
                  color: 'var(--iven-muted)',
                }}
              >
                <Plus size={14} />
                Add &ldquo;{q}&rdquo; as a title only
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
