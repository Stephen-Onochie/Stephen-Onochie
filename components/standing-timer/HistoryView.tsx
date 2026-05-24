'use client'

import { formatDurationHuman } from '@/lib/standing-timer/cycle'
import { sessionDurationSeconds } from '@/lib/standing-timer/stats'
import { MODE_ICONS, MODE_LABELS } from '@/lib/standing-timer/cycle'
import type { SessionWithIntervals } from '@/types/standing-timer'

interface HistoryViewProps {
  history: SessionWithIntervals[]
  loading: boolean
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function HistoryView({ history, loading }: HistoryViewProps) {
  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-textMuted font-inter text-sm">
          No sessions yet. Start a timer to build history.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4 max-w-lg mx-auto">
      {history.map((session) => {
        const duration = sessionDurationSeconds(session.intervals)
        const completedIntervals = session.intervals.filter((i) => i.completed)

        return (
          <article key={session.id} className="bg-surface rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-playfair text-lg font-bold text-textPrimary">
                {formatSessionDate(session.started_at)}
              </h3>
              <span className="text-xs font-inter uppercase tracking-wide text-gold">
                {session.status}
              </span>
            </div>
            <p className="text-textMuted font-inter text-sm mt-2">
              {formatDurationHuman(duration)} · {completedIntervals.length} interval
              {completedIntervals.length === 1 ? '' : 's'}
            </p>
            {completedIntervals.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-goldLight pt-4">
                {completedIntervals.map((interval) => (
                  <li
                    key={interval.id}
                    className="flex items-center justify-between text-sm font-inter"
                  >
                    <span className="text-textPrimary">
                      {MODE_ICONS[interval.mode]} {MODE_LABELS[interval.mode]}
                    </span>
                    <span className="text-textMuted">
                      {formatDurationHuman(interval.actual_seconds ?? interval.planned_seconds)} ✓
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        )
      })}
    </div>
  )
}
