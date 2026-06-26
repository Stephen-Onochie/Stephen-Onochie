'use client'

import { useMemo } from 'react'
import { Calendar, AlertCircle, CalendarClock, CheckSquare, TrendingDown } from 'lucide-react'
import type { Application, Contact, Interview, Task, WeeklyGoal } from '@/types/internship'
import {
  LANE_LABELS,
  CITY_LABELS,
  ROLE_TYPE_LABELS,
  INTERVIEW_TYPE_LABELS,
} from '@/types/internship'
import {
  weeklyProgress,
  funnel,
  thisWeek,
  distribution,
  tractionFlag,
  type ReminderData,
} from '@/lib/internship/reminders'
import { formatShortDate, formatDateTime } from '@/lib/internship/dates'
import { Pill } from './ui'

export default function Dashboard({
  applications,
  contacts,
  interviews,
  tasks,
  weeklyGoals,
  onOpenApp,
  onOpenContact,
}: {
  applications: Application[]
  contacts: Contact[]
  interviews: Interview[]
  tasks: Task[]
  weeklyGoals: WeeklyGoal[]
  onOpenApp: (a: Application) => void
  onOpenContact: (c: Contact) => void
}) {
  const data: ReminderData = useMemo(
    () => ({ applications, contacts, interviews, tasks, weeklyGoals }),
    [applications, contacts, interviews, tasks, weeklyGoals]
  )

  const wp = weeklyProgress(data)
  const fn = funnel(data)
  const tw = thisWeek(data)
  const dist = distribution(data)
  const traction = tractionFlag(data)

  return (
    <div className="flex flex-col gap-6">
      {traction && (
        <Banner color="#A8743B" icon={<TrendingDown size={16} />}>
          Low interview traction this late in the cycle. The fix is resume framing + Lane 3 outreach,
          not more volume.
        </Banner>
      )}

      {/* Top row: weekly target + funnel */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.4fr)' }}>
        <Panel title="This Week's Target">
          <div className="flex items-end gap-2 mb-3">
            <span className="font-playfair font-bold text-[40px] leading-none" style={{ color: 'var(--iven-text)' }}>
              {wp.actual}
            </span>
            <span className="text-[16px] mb-1" style={{ color: 'var(--iven-muted)' }}>
              / {wp.target} applied
            </span>
          </div>
          <div className="rounded-full overflow-hidden h-2.5" style={{ background: 'var(--iven-grid)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (wp.actual / Math.max(1, wp.target)) * 100)}%`,
                background: wp.actual >= wp.target ? '#7C8C5A' : 'var(--iven-accent)',
              }}
            />
          </div>
          <div className="font-mono text-[10px] mt-2" style={{ color: 'var(--iven-muted)' }}>
            WEEK OF {formatShortDate(wp.weekStart)}
          </div>
        </Panel>

        <Panel title="Funnel">
          <div className="flex items-stretch gap-2">
            <FunnelStep label="Applied" value={fn.reachedApplied} />
            <FunnelArrow rate={rate(fn.reachedOA, fn.reachedApplied)} />
            <FunnelStep label="OA" value={fn.reachedOA} />
            <FunnelArrow rate={rate(fn.reachedInterview, fn.reachedOA)} />
            <FunnelStep label="Interview" value={fn.reachedInterview} />
            <FunnelArrow rate={rate(fn.reachedOffer, fn.reachedInterview)} />
            <FunnelStep label="Offer" value={fn.reachedOffer} highlight />
          </div>
        </Panel>
      </div>

      {/* This-week panel */}
      <Panel title="Needs Attention">
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <AttentionList
            icon={<Calendar size={13} />}
            title="Lane 1 deadlines ≤14d"
            empty="No upcoming deadlines"
            items={tw.deadlines.map(a => ({
              key: a.id,
              onClick: () => onOpenApp(a),
              primary: a.company,
              secondary: a.deadline ? formatShortDate(a.deadline) : '',
              warn: true,
            }))}
          />
          <AttentionList
            icon={<AlertCircle size={13} />}
            title="Overdue follow-ups"
            empty="All caught up"
            items={tw.overdueContacts.map(c => ({
              key: c.id,
              onClick: () => onOpenContact(c),
              primary: c.name,
              secondary: c.next_action ?? '',
              warn: true,
            }))}
          />
          <AttentionList
            icon={<CalendarClock size={13} />}
            title="Interviews this week"
            empty="None scheduled"
            items={tw.interviews.map(iv => {
              const app = applications.find(a => a.id === iv.application_id)
              return {
                key: iv.id,
                onClick: () => app && onOpenApp(app),
                primary: app?.company ?? 'Unknown',
                secondary: `${INTERVIEW_TYPE_LABELS[iv.type]} · ${formatDateTime(iv.scheduled_at)}`,
              }
            })}
          />
          <AttentionList
            icon={<CheckSquare size={13} />}
            title="Open tasks"
            empty="No open tasks"
            items={tw.openTasks.map(t => ({
              key: t.id,
              primary: t.title,
              secondary: t.due_date ? formatShortDate(t.due_date) : '',
            }))}
          />
        </div>
      </Panel>

      {/* Distributions */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <Panel title="By Lane">
          <DistBars data={dist.byLane} labels={LANE_LABELS} />
        </Panel>
        <Panel title="By City">
          <DistBars data={dist.byCity} labels={CITY_LABELS} />
        </Panel>
        <Panel title="By Role Type">
          <DistBars data={dist.byRole} labels={ROLE_TYPE_LABELS} />
        </Panel>
      </div>
    </div>
  )
}

function rate(num: number, den: number): number {
  if (den === 0) return 0
  return Math.round((num / den) * 100)
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}
    >
      <div className="font-mono text-[10px] font-semibold tracking-[2px] uppercase mb-4" style={{ color: 'var(--iven-accent)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Banner({ children, color, icon }: { children: React.ReactNode; color: string; icon: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3"
      style={{ background: `color-mix(in srgb, ${color} 12%, var(--iven-surface))`, border: `1px solid ${color}` }}
    >
      <span style={{ color }}>{icon}</span>
      <span className="text-[13px]" style={{ color: 'var(--iven-text)' }}>{children}</span>
    </div>
  )
}

function FunnelStep({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className="flex-1 rounded-xl p-3 text-center"
      style={{
        background: highlight ? 'color-mix(in srgb, #7C8C5A 18%, var(--iven-bg))' : 'var(--iven-bg)',
        border: '1px solid var(--iven-grid)',
      }}
    >
      <div className="font-playfair font-bold text-[26px] leading-none" style={{ color: 'var(--iven-text)' }}>
        {value}
      </div>
      <div className="font-mono text-[9px] font-semibold tracking-[1px] uppercase mt-1.5" style={{ color: 'var(--iven-muted)' }}>
        {label}
      </div>
    </div>
  )
}

function FunnelArrow({ rate }: { rate: number }) {
  return (
    <div className="flex flex-col items-center justify-center px-0.5" style={{ minWidth: 38 }}>
      <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--iven-muted)' }}>{rate}%</span>
    </div>
  )
}

function AttentionList({
  icon,
  title,
  empty,
  items,
}: {
  icon: React.ReactNode
  title: string
  empty: string
  items: { key: string; primary: string; secondary?: string; onClick?: () => void; warn?: boolean }[]
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5" style={{ color: 'var(--iven-text)' }}>
        <span style={{ color: 'var(--iven-muted)' }}>{icon}</span>
        <span className="font-mono text-[10px] font-semibold tracking-[1px] uppercase">{title}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>{empty}</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map(it => (
            <button
              key={it.key}
              onClick={it.onClick}
              className="text-left rounded-lg px-2.5 py-1.5"
              style={{
                background: 'var(--iven-bg)',
                border: `1px solid ${it.warn ? 'color-mix(in srgb, #A8743B 40%, transparent)' : 'var(--iven-grid)'}`,
                cursor: it.onClick ? 'pointer' : 'default',
              }}
            >
              <div className="text-[12px] font-medium leading-tight" style={{ color: 'var(--iven-text)' }}>{it.primary}</div>
              {it.secondary && (
                <div className="text-[10px] leading-tight" style={{ color: 'var(--iven-muted)' }}>{it.secondary}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DistBars({ data, labels }: { data: Record<string, number>; labels: Record<string, string> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...entries.map(([, v]) => v))
  if (entries.length === 0) {
    return <div className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>No data</div>
  }
  return (
    <div className="flex flex-col gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="text-[11px] w-20 flex-shrink-0 truncate" style={{ color: 'var(--iven-muted)' }}>
            {labels[k] ?? k}
          </span>
          <div className="flex-1 rounded-full overflow-hidden h-2" style={{ background: 'var(--iven-grid)' }}>
            <div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: 'var(--iven-accent)' }} />
          </div>
          <span className="font-mono text-[11px] font-semibold w-5 text-right" style={{ color: 'var(--iven-text)' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}
