import type { Application, Contact, Interview, Task, WeeklyGoal } from '@/types/internship'
import { currentWeekRange, currentWeekStart, daysUntil, isOverdue } from './dates'
import { addDaysToDateStr, easternMonday } from '@/lib/dates'
import { isExpired, DEFAULT_EXPIRY_DAYS } from './expiry'

export interface ReminderData {
  applications: Application[]
  contacts: Contact[]
  interviews: Interview[]
  tasks: Task[]
  weeklyGoals: WeeklyGoal[]
  expiryDays?: number
}

export interface WeeklyProgress {
  weekStart: string
  target: number
  actual: number
}

const DEFAULT_WEEKLY_TARGET = 5

function appliedCountsByWeek(apps: Application[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const a of apps) {
    if (!a.applied_at) continue
    const wk = easternMonday(new Date(a.applied_at))
    counts.set(wk, (counts.get(wk) ?? 0) + 1)
  }
  return counts
}

/** Applications stamped applied within the current Eastern (Mon-start) week. */
export function weeklyProgress(data: ReminderData, now = new Date()): WeeklyProgress {
  const weekStart = currentWeekStart(now)
  const goal = data.weeklyGoals.find(g => g.week_start === weekStart)
  const actual = appliedCountsByWeek(data.applications).get(weekStart) ?? 0
  return { weekStart, target: goal?.target_apps ?? DEFAULT_WEEKLY_TARGET, actual }
}

export interface WeekBucket {
  weekStart: string
  count: number
  target: number
}

export interface WeeklyHistory {
  weeks: WeekBucket[] // oldest → newest, ending with the current week
  average: number // mean over the completed weeks shown
  bestWeek: number
  /** Consecutive completed weeks (most recent first) that met their target. */
  streak: number
  /** Apps past wishlist with no applied date — invisible to the weekly counts. */
  undated: number
}

export function weeklyHistory(data: ReminderData, numWeeks = 12, now = new Date()): WeeklyHistory {
  const counts = appliedCountsByWeek(data.applications)
  const goals = new Map(data.weeklyGoals.map(g => [g.week_start, g.target_apps]))
  const current = currentWeekStart(now)
  const weeks: WeekBucket[] = []
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = addDaysToDateStr(current, -7 * i)
    weeks.push({
      weekStart,
      count: counts.get(weekStart) ?? 0,
      target: goals.get(weekStart) ?? DEFAULT_WEEKLY_TARGET,
    })
  }
  const completed = weeks.slice(0, -1)
  const average = completed.length
    ? Math.round((completed.reduce((s, w) => s + w.count, 0) / completed.length) * 10) / 10
    : 0
  let streak = 0
  for (let i = completed.length - 1; i >= 0 && completed[i].count >= completed[i].target; i--) streak++
  const undated = data.applications.filter(
    a => !a.applied_at && ['applied', 'oa', 'interview', 'offer'].includes(a.stage)
  ).length
  return {
    weeks,
    average,
    bestWeek: Math.max(0, ...weeks.map(w => w.count)),
    streak,
    undated,
  }
}

export interface FunnelStats {
  applied: number
  oa: number
  interview: number
  offer: number
  // Cumulative counts: anything that reached >= a stage.
  reachedApplied: number
  reachedOA: number
  reachedInterview: number
  reachedOffer: number
}

const STAGE_RANK: Record<string, number> = {
  wishlist: 0, applied: 1, oa: 2, interview: 3, offer: 4, closed: 1,
}

export function funnel(data: ReminderData): FunnelStats {
  let reachedApplied = 0, reachedOA = 0, reachedInterview = 0, reachedOffer = 0
  for (const a of data.applications) {
    // A closed app still counts as having been applied (it left wishlist).
    const rank = a.stage === 'closed' ? (a.applied_at ? 1 : 0) : STAGE_RANK[a.stage]
    if (rank >= 1) reachedApplied++
    if (rank >= 2) reachedOA++
    if (rank >= 3) reachedInterview++
    if (rank >= 4) reachedOffer++
  }
  return {
    applied: data.applications.filter(a => a.stage === 'applied').length,
    oa: data.applications.filter(a => a.stage === 'oa').length,
    interview: data.applications.filter(a => a.stage === 'interview').length,
    offer: data.applications.filter(a => a.stage === 'offer').length,
    reachedApplied, reachedOA, reachedInterview, reachedOffer,
  }
}

export interface ThisWeek {
  deadlines: Application[] // Lane 1 deadlines within 14 days
  overdueContacts: Contact[] // overdue next-actions
  interviews: Interview[] // this week
  openTasks: Task[] // due this week or overdue, not done
}

export function thisWeek(data: ReminderData, now = new Date()): ThisWeek {
  const { start, end } = currentWeekRange(now)

  const deadlines = data.applications
    .filter(a => a.deadline && a.stage !== 'closed' && daysUntil(a.deadline, now) <= 14 && daysUntil(a.deadline, now) >= 0)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())

  const overdueContacts = data.contacts.filter(
    c => c.next_action_date && isOverdue(c.next_action_date, now) && c.pipeline_state !== 'dormant'
  )

  const interviews = data.interviews
    .filter(iv => {
      const t = new Date(iv.scheduled_at).getTime()
      return t >= start.getTime() && t < end.getTime()
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const openTasks = data.tasks.filter(t => {
    if (t.done) return false
    if (!t.due_date) return false
    return new Date(t.due_date).getTime() < end.getTime()
  })

  return { deadlines, overdueContacts, interviews, openTasks }
}

export interface Distribution {
  byLane: Record<string, number>
  byCity: Record<string, number>
  byRole: Record<string, number>
}

export function distribution(data: ReminderData): Distribution {
  const byLane: Record<string, number> = {}
  const byCity: Record<string, number> = {}
  const byRole: Record<string, number> = {}
  for (const a of data.applications) {
    byLane[a.lane] = (byLane[a.lane] ?? 0) + 1
    byCity[a.city_tag] = (byCity[a.city_tag] ?? 0) + 1
    byRole[a.role_type] = (byRole[a.role_type] ?? 0) + 1
  }
  return { byLane, byCity, byRole }
}

/**
 * Traction check from the guide: if it's February or later and the count of
 * applications that have reached the interview stage is below threshold, the
 * fix is resume framing + Lane 3 outreach, not more volume.
 */
export function tractionFlag(data: ReminderData, now = new Date()): boolean {
  const month = now.getMonth() // 0=Jan, 1=Feb
  const isFebOrLater = month >= 1 && month <= 5 // Feb–Jun of the cycle year
  if (!isFebOrLater) return false
  const f = funnel(data)
  return f.reachedInterview < 3
}

/** Stale wishlist cards: in wishlist > 21 days since creation. */
export function staleWishlist(data: ReminderData, now = new Date()): Application[] {
  return data.applications.filter(
    a => a.stage === 'wishlist' && !isExpired(a, data.expiryDays ?? DEFAULT_EXPIRY_DAYS, now) && daysUntil(a.created_at, now) <= -21
  )
}
