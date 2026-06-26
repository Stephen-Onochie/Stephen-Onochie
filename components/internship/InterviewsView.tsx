'use client'

import { useMemo } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import type { Interview, Application } from '@/types/internship'
import { INTERVIEW_TYPE_LABELS } from '@/types/internship'
import { formatDateTime } from '@/lib/internship/dates'
import { Pill } from './ui'

interface Enriched extends Interview {
  app?: Application
  conflict: boolean
}

export default function InterviewsView({
  interviews,
  applications,
  onOpenApp,
}: {
  interviews: Interview[]
  applications: Application[]
  onOpenApp: (a: Application) => void
}) {
  const enriched = useMemo<Enriched[]>(() => {
    const sorted = [...interviews].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )
    // Flag overlaps: two interviews whose [start, start+duration] windows intersect.
    return sorted.map((iv, i) => {
      const start = new Date(iv.scheduled_at).getTime()
      const end = start + iv.duration_mins * 60000
      let conflict = false
      for (let j = 0; j < sorted.length; j++) {
        if (j === i) continue
        const oStart = new Date(sorted[j].scheduled_at).getTime()
        const oEnd = oStart + sorted[j].duration_mins * 60000
        if (start < oEnd && oStart < end) {
          conflict = true
          break
        }
      }
      return {
        ...iv,
        app: applications.find(a => a.id === iv.application_id),
        conflict,
      }
    })
  }, [interviews, applications])

  const now = Date.now()
  const upcoming = enriched.filter(iv => new Date(iv.scheduled_at).getTime() >= now)
  const past = enriched.filter(iv => new Date(iv.scheduled_at).getTime() < now).reverse()

  if (interviews.length === 0) {
    return (
      <div className="text-[14px] py-12 text-center" style={{ color: 'var(--iven-muted)' }}>
        No interviews scheduled yet. Add one from an application&apos;s detail view.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title="Upcoming" items={upcoming} onOpenApp={onOpenApp} />
      {past.length > 0 && <Section title="Past" items={past} onOpenApp={onOpenApp} muted />}
    </div>
  )
}

function Section({
  title,
  items,
  onOpenApp,
  muted,
}: {
  title: string
  items: Enriched[]
  onOpenApp: (a: Application) => void
  muted?: boolean
}) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="font-mono text-[10px] font-semibold tracking-[2px] uppercase mb-3" style={{ color: 'var(--iven-accent)' }}>
        {title}
      </div>
      <div className="flex flex-col gap-2">
        {items.map(iv => (
          <div
            key={iv.id}
            onClick={() => iv.app && onOpenApp(iv.app)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer"
            style={{
              background: 'var(--iven-surface)',
              border: `1px solid ${iv.conflict ? '#A8743B' : 'var(--iven-grid)'}`,
              opacity: muted ? 0.7 : 1,
            }}
          >
            <Clock size={16} style={{ color: 'var(--iven-muted)' }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold" style={{ color: 'var(--iven-text)' }}>
                  {iv.app?.company ?? 'Unknown'}
                </span>
                <Pill>{INTERVIEW_TYPE_LABELS[iv.type]}</Pill>
                {iv.conflict && (
                  <span className="flex items-center gap-1 font-mono text-[10px] font-semibold" style={{ color: '#A8743B' }}>
                    <AlertTriangle size={11} /> CONFLICT
                  </span>
                )}
              </div>
              <div className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>
                {iv.app?.role_title}
              </div>
            </div>
            <div className="text-[12px] font-mono whitespace-nowrap" style={{ color: 'var(--iven-text)' }}>
              {formatDateTime(iv.scheduled_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
