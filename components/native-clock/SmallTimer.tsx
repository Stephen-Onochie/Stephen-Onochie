'use client'

import { useEffect, useState } from 'react'

interface SmallTimerProps {
  visible: boolean
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function SmallTimer({ visible }: SmallTimerProps) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  if (!visible) return null

  return (
    <aside
      className="rounded-lg border px-3 py-2 min-w-[7.5rem]"
      style={{
        backgroundColor: 'var(--nc-surface)',
        borderColor: 'var(--nc-border)',
      }}
      aria-label="Small timer"
    >
      <p
        className="font-mono text-[9px] uppercase tracking-[0.2em] mb-1"
        style={{ color: 'var(--nc-muted)' }}
      >
        Timer
      </p>
      <p className="font-display text-2xl tabular-nums leading-none mb-2">
        {formatElapsed(elapsed)}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="flex-1 font-mono text-[9px] uppercase tracking-[0.15em] py-1 rounded border transition-colors"
          style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-text)' }}
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false)
            setElapsed(0)
          }}
          className="font-mono text-[9px] uppercase tracking-[0.15em] py-1 px-2 rounded border transition-colors"
          style={{ borderColor: 'var(--nc-border)', color: 'var(--nc-muted)' }}
        >
          Reset
        </button>
      </div>
    </aside>
  )
}
