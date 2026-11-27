'use client'

import { useMemo, useState } from 'react'
import { Calendar, AlertCircle, CalendarClock, CheckSquare, TrendingDown } from 'lucide-react'
import type { Application, Contact, FocusArea, Interview, Task, WeeklyGoal } from '@/types/internship'
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
  weeklyHistory,
  allTimeTotals,
  pipelineOf,
  CORE_PIPELINE,
  type ReminderData,
  type WeeklyHistory,
} from '@/lib/internship/reminders'
import { formatShortDate, formatDateTime } from '@/lib/internship/dates'
import { Pill } from './ui'

export default function Dashboard({
  applications,
  contacts,
  interviews,
  tasks,
  weeklyGoals,
  focusAreas,
  onOpenApp,
  onOpenContact,
}: {
  applications: Application[]
  focusAreas: FocusArea[]
  contacts: Contact[]
  interviews: Interview[]
  tasks: Task[]
  weeklyGoals: WeeklyGoal[]
  onOpenApp: (a: Application) => void
  onOpenContact: (c: Contact) => void
}) {
  // 'all' | CORE_PIPELINE | a focus-area id. Every number below follows it.
  const [pipeline, setPipeline] = useState<string>('all')
  const pipelineName = (key: string) =>
    key === CORE_PIPELINE ? 'Core engineering' : focusAreas.find(f => f.id === key)?.name ?? 'Unknown'

  const scoped = useMemo(
    () => (pipeline === 'all' ? applications : applications.filter(a => pipelineOf(a) === pipeline)),
    [applications, pipeline]
  )
  const data: ReminderData = useMemo(
    () => ({ applications: scoped, contacts, interviews, tasks, weeklyGoals }),
    [scoped, contacts, interviews, tasks, weeklyGoals]
  )

  const totals = allTimeTotals(scoped)
  // One row per pipeline that has any card, core first, then areas in order.
  const pipelineRows = useMemo(() => {
    const keys = [CORE_PIPELINE, ...focusAreas.map(f => f.id)]
    return keys
      .map(key => {
        const apps = applications.filter(a => pipelineOf(a) === key)
        return { key, tracked: apps.length, ...allTimeTotals(apps) }
      })
      .filter(r => r.tracked > 0)
  }, [applications, focusAreas])

  const wp = weeklyProgress(data)
  const fn = funnel(data)
  const tw = thisWeek(data)
  const dist = distribution(data)
  const traction = tractionFlag(data)
  const history = weeklyHistory(data)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] font-semibold tracking-[2px] uppercase mr-1" style={{ color: 'var(--iven-muted)' }}>
          Pipeline
        </span>
        {['all', ...pipelineRows.map(r => r.key)].map(key => (
          <button
            key={key}
            onClick={() => setPipeline(key)}
            className="rounded-full px-3 py-1 text-[12px] font-medium"
            style={{
              background: pipeline === key ? 'var(--iven-accent)' : 'var(--iven-surface)',
              color: pipeline === key ? '#2C1F0E' : 'var(--iven-text)',
              border: '1px solid var(--iven-grid)',
            }}
          >
            {key === 'all' ? 'All pipelines' : pipelineName(key)}
          </button>
        ))}
      </div>

      <Panel title={pipeline === 'all' ? 'All-Time Totals' : `All-Time Totals · ${pipelineName(pipeline)}`}>
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <BigStat label="Applications sent" value={totals.sent} />
          <BigStat label="Waiting to hear" value={totals.waiting} />
          <BigStat label="Reached OA" value={totals.reachedOA} />
          <BigStat label="Reached interview" value={totals.reachedInterview} />
          <BigStat label="Offers" value={totals.offers} />
          <BigStat label="Rejections" value={totals.rejected} />
          <BigStat label="Response rate" value={`${totals.responseRate}%`} />
        </div>
        <div className="font-mono text-[10px] mt-3" style={{ color: 'var(--iven-muted)' }}>
          Every card that ever left Wishlist, with no date window. Response rate = OA or later, or a rejection, out of
          applications sent.
        </div>
      </Panel>

      {pipelineRows.length > 1 && (
        <Panel title="Results By Pipeline">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]" style={{ color: 'var(--iven-text)' }}>
              <thead>
                <tr className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
                  {['Pipeline', 'Tracked', 'Sent', 'OA+', 'Interview+', 'Offers', 'Response', 'Interview rate'].map((h, i) => (
                    <th key={h} className={`pb-2 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipelineRows.map(r => (
                  <tr
                    key={r.key}
                    onClick={() => setPipeline(r.key)}
                    className="cursor-pointer"
                    style={{ borderTop: '1px solid var(--iven-grid)', fontWeight: pipeline === r.key ? 600 : 400 }}
                  >
                    <td className="py-1.5 text-left">{pipelineName(r.key)}</td>
                    <td className="py-1.5 text-right font-mono" style={{ color: 'var(--iven-muted)' }}>{r.tracked}</td>
                    <td className="py-1.5 text-right font-mono">{r.sent}</td>
                    <td className="py-1.5 text-right font-mono">{r.reachedOA}</td>
                    <td className="py-1.5 text-right font-mono">{r.reachedInterview}</td>
                    <td className="py-1.5 text-right font-mono">{r.offers}</td>
                    <td className="py-1.5 text-right font-mono">{r.sent ? `${r.responseRate}%` : '—'}</td>
                    <td className="py-1.5 text-right font-mono">{r.sent ? `${r.interviewRate}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="font-mono text-[10px] mt-3" style={{ color: 'var(--iven-muted)' }}>
            Pipeline = the card&apos;s focus area (Sources tab). Cards with none count as Core engineering. Click a row to
            filter the whole dashboard.
          </div>
        </Panel>
      )}

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

      <Panel title="Applications Per Week">
        <WeeklyChart history={history} />
      </Panel>

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

function WeeklyChart({ history }: { history: WeeklyHistory }) {
  const { weeks } = history
  const max = Math.max(1, ...weeks.map(w => Math.max(w.count, w.target)))
  const CHART_H = 120
  return (
    <div>
      <div className="flex flex-wrap gap-x-8 gap-y-2 mb-4">
        <Stat label="Avg / week" value={history.average} />
        <Stat label="Best week" value={history.bestWeek} />
        <Stat label="Target streak" value={`${history.streak}w`} />
      </div>
      <div className="flex items-end gap-1.5" style={{ height: CHART_H }}>
        {weeks.map((w, i) => {
          const isCurrent = i === weeks.length - 1
          const met = w.count >= w.target
          return (
            <div
              key={w.weekStart}
              className="relative flex-1 flex flex-col justify-end h-full"
              title={`Week of ${formatShortDate(w.weekStart + 'T12:00:00')}: ${w.count} / ${w.target}`}
            >
              <div
                className="absolute left-0 right-0"
                style={{ bottom: (w.target / max) * CHART_H, borderTop: '1px dashed var(--iven-muted)', opacity: 0.6 }}
              />
              {w.count > 0 && (
                <div
                  className="font-mono text-[9px] font-semibold text-center mb-0.5"
                  style={{ color: 'var(--iven-text)' }}
                >
                  {w.count}
                </div>
              )}
              <div
                className="rounded-t-md"
                style={{
                  height: Math.max(2, (w.count / max) * CHART_H - (w.count > 0 ? 14 : 0)),
                  background: met ? '#7C8C5A' : 'var(--iven-accent)',
                  opacity: isCurrent ? 1 : w.count > 0 ? 0.85 : 0.25,
                  outline: isCurrent ? '1px solid var(--iven-text)' : undefined,
                  outlineOffset: 1,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {weeks.map((w, i) => (
          <div key={w.weekStart} className="flex-1 text-center font-mono text-[8px] truncate" style={{ color: 'var(--iven-muted)' }}>
            {(weeks.length - 1 - i) % 2 === 0 ? formatShortDate(w.weekStart + 'T12:00:00') : ''}
          </div>
        ))}
      </div>
      <div className="font-mono text-[10px] mt-3" style={{ color: 'var(--iven-muted)' }}>
        Counted from each card&apos;s applied date (set automatically when it leaves Wishlist, editable in
        the card). Dashed line = weekly target.
        {history.undated > 0 && ` ${history.undated} applied card${history.undated === 1 ? ' has' : 's have'} no applied date and aren't counted.`}
      </div>
    </div>
  )
}

function BigStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="font-playfair font-bold text-[32px] leading-none" style={{ color: 'var(--iven-text)' }}>{value}</div>
      <div className="font-mono text-[9px] font-semibold tracking-[1px] uppercase mt-1.5" style={{ color: 'var(--iven-muted)' }}>
        {label}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="font-playfair font-bold text-[22px] leading-none" style={{ color: 'var(--iven-text)' }}>{value}</div>
      <div className="font-mono text-[9px] font-semibold tracking-[1px] uppercase mt-1" style={{ color: 'var(--iven-muted)' }}>
        {label}
      </div>
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
