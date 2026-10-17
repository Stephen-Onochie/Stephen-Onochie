'use client'

import { useEffect, useRef, useState } from 'react'

const HISTORY_SIZE = 5
const FINISH_HOLD_MS = 700
// Never claim more than this while the request is still running.
const MAX_PENDING_PCT = 95

function readHistory(key: string): number[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number' && n > 0) : []
  } catch {
    return []
  }
}

function writeHistory(key: string, history: number[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(history.slice(-HISTORY_SIZE)))
  } catch {
    // Private mode or blocked storage: the default estimate still works.
  }
}

/**
 * Generation is one long model call with no intermediate signal, so this bar is
 * time-based: it eases toward 95% around the typical duration (learned from the
 * last few runs in this browser) and snaps to 100% when the work finishes.
 */
export default function EstimatedProgress({
  active,
  storageKey,
  defaultMs,
  steps,
  className = 'mt-3',
}: {
  active: boolean
  storageKey: string
  defaultMs: number
  steps: string[]
  className?: string
}) {
  const historyKey = `stylemate-duration:${storageKey}`
  const startedAt = useRef<number | null>(null)
  const expectedMs = useRef(defaultMs)
  const [elapsed, setElapsed] = useState(0)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (active) {
      const history = readHistory(historyKey)
      expectedMs.current = history.length ? history.reduce((a, b) => a + b, 0) / history.length : defaultMs
      startedAt.current = Date.now()
      setElapsed(0)
      setFinishing(false)
      const id = window.setInterval(() => setElapsed(Date.now() - (startedAt.current ?? Date.now())), 250)
      return () => window.clearInterval(id)
    }
    if (startedAt.current === null) return
    writeHistory(historyKey, [...readHistory(historyKey), Date.now() - startedAt.current])
    startedAt.current = null
    setFinishing(true)
    const id = window.setTimeout(() => setFinishing(false), FINISH_HOLD_MS)
    return () => window.clearTimeout(id)
  }, [active, historyKey, defaultMs])

  if (!active && !finishing) return null

  // 1 - e^(-1.6t) reaches ~80% at the expected duration and keeps creeping after.
  const pct = finishing ? 100 : Math.min(MAX_PENDING_PCT, 100 * (1 - Math.exp((-1.6 * elapsed) / expectedMs.current)))
  const step = finishing ? 'Done' : steps[Math.min(steps.length - 1, Math.floor((pct / MAX_PENDING_PCT) * steps.length))]
  const overdue = !finishing && elapsed > expectedMs.current * 1.4

  return (
    <div className={className} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={step}>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--iven-grid)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'var(--iven-accent)', transition: 'width 250ms linear' }}
        />
      </div>
      <div className="flex justify-between gap-3 mt-1.5 font-mono text-[10px] uppercase tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
        <span className="truncate">{overdue ? 'Almost there, this one is taking a little longer' : step}</span>
        <span className="shrink-0">{Math.round(elapsed / 1000)}s</span>
      </div>
    </div>
  )
}
