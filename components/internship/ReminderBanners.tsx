'use client'

import { useState } from 'react'
import { CalendarCheck, Bell, X } from 'lucide-react'
import type { Application, Contact, Interview, Task, WeeklyGoal } from '@/types/internship'
import {
  weeklyProgress,
  thisWeek,
  staleWishlist,
  type ReminderData,
} from '@/lib/internship/reminders'
import { isSunday, toLocalDateString } from '@/lib/internship/dates'

// Sunday review is dismissible for the day; persisted in localStorage so it
// doesn't re-nag after acknowledging.
function dismissedKey(): string {
  return `internship-sunday-dismissed-${toLocalDateString(new Date())}`
}

export default function ReminderBanners({
  applications,
  contacts,
  interviews,
  tasks,
  weeklyGoals,
}: {
  applications: Application[]
  contacts: Contact[]
  interviews: Interview[]
  tasks: Task[]
  weeklyGoals: WeeklyGoal[]
}) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(dismissedKey()) === '1'
  })

  const data: ReminderData = { applications, contacts, interviews, tasks, weeklyGoals }
  const wp = weeklyProgress(data)
  const tw = thisWeek(data)
  const stale = staleWishlist(data)

  // T-7/T-3/T-1 deadline alerts.
  const imminent = tw.deadlines.filter(a => {
    const days = a.deadline
      ? Math.ceil((new Date(a.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 99
    return days <= 7
  })

  const showSunday = isSunday() && !dismissed

  if (!showSunday && imminent.length === 0) return null

  function dismiss() {
    window.localStorage.setItem(dismissedKey(), '1')
    setDismissed(true)
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      {showSunday && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: 'color-mix(in srgb, var(--iven-accent) 14%, var(--iven-surface))',
            border: '1px solid var(--iven-border)',
          }}
        >
          <CalendarCheck size={18} style={{ color: 'var(--iven-accent)', marginTop: 1 }} />
          <div className="flex-1">
            <div className="font-mono text-[10px] font-semibold tracking-[2px] uppercase mb-1" style={{ color: 'var(--iven-accent)' }}>
              Sunday Review
            </div>
            <div className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
              New week target: <strong>{wp.target} applications</strong>.{' '}
              {tw.deadlines.length > 0 && <>{tw.deadlines.length} deadline(s) this week. </>}
              {tw.overdueContacts.length > 0 && <>{tw.overdueContacts.length} overdue follow-up(s). </>}
              {stale.length > 0 && <>{stale.length} stale wishlist card(s) to triage.</>}
              {tw.deadlines.length === 0 && tw.overdueContacts.length === 0 && stale.length === 0 && (
                <>Nothing overdue — good place to start the week.</>
              )}
            </div>
          </div>
          <button onClick={dismiss} aria-label="Dismiss" style={{ color: 'var(--iven-muted)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {imminent.map(a => {
        const days = Math.ceil((new Date(a.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-xl px-4 py-2.5"
            style={{ background: 'color-mix(in srgb, #A8743B 12%, var(--iven-surface))', border: '1px solid #A8743B' }}
          >
            <Bell size={15} style={{ color: '#A8743B' }} />
            <span className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
              <strong>{a.company}</strong> deadline in {days <= 0 ? 'today' : `${days} day${days === 1 ? '' : 's'}`}.
            </span>
          </div>
        )
      })}
    </div>
  )
}
