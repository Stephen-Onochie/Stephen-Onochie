'use client'

import { useMemo } from 'react'
import { Flame, CheckCircle2, AlertTriangle, Repeat } from 'lucide-react'
import type { Todo, Recurrence } from '@/types/todo'
import { computeWeeklyReview, isSunday } from '@/lib/todo/weekly-review'

// Computed-on-read weekly summary. Always available; highlighted on Sundays.
export default function WeeklyReview({ todos, recurrences }: { todos: Todo[]; recurrences: Recurrence[] }) {
  const review = useMemo(() => computeWeeklyReview(todos, recurrences), [todos, recurrences])
  const sunday = isSunday()

  return (
    <div
      className="rounded-[18px] p-6 mt-6"
      style={{
        background: 'var(--iven-surface)',
        border: `1px solid ${sunday ? 'var(--iven-accent)' : 'var(--iven-border)'}`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase mb-1" style={{ color: 'var(--iven-accent)' }}>
            WEEKLY REVIEW
          </div>
          <div className="font-playfair font-bold text-xl" style={{ color: 'var(--iven-text)' }}>
            {sunday ? 'Your week' : 'Last 7 days'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat icon={<CheckCircle2 size={15} />} value={review.completedCount} label="COMPLETED" />
        <Stat icon={<AlertTriangle size={15} />} value={review.slipped.length} label="SLIPPED" />
        <Stat icon={<Repeat size={15} />} value={review.upcomingRecurring} label="RECURRING" />
      </div>

      {review.habitStreaks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {review.habitStreaks.slice(0, 5).map(h => (
            <div key={h.title} className="flex items-center gap-2 text-[13px] font-inter" style={{ color: 'var(--iven-text)' }}>
              <Flame size={14} style={{ color: 'var(--iven-accent)' }} />
              <span className="flex-1">{h.title}</span>
              <span className="font-mono text-[12px]" style={{ color: 'var(--iven-muted)' }}>{h.streak}d</span>
            </div>
          ))}
        </div>
      )}

      {review.slipped.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--iven-grid)' }}>
          <div className="font-mono text-[10px] tracking-[1.5px] mb-2" style={{ color: 'var(--iven-muted)' }}>SLIPPED</div>
          {review.slipped.slice(0, 4).map(t => (
            <div key={t.id} className="text-[13px] font-inter" style={{ color: '#6B4F2A' }}>{t.title}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-[14px] p-3 flex flex-col gap-1" style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-grid)' }}>
      <span style={{ color: 'var(--iven-accent)' }}>{icon}</span>
      <span className="font-mono text-2xl" style={{ color: 'var(--iven-text)' }}>{value}</span>
      <span className="font-mono text-[9px] tracking-[1.5px]" style={{ color: 'var(--iven-muted)' }}>{label}</span>
    </div>
  )
}
