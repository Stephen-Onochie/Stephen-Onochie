import type { Application, Contact, Interview, Task, WeeklyGoal } from '@/types/internship'
import { currentWeekRange, currentWeekStart, daysUntil, isOverdue } from './dates'

export interface ReminderData {
  applications: Application[]
  contacts: Contact[]
  interviews: Interview[]
  tasks: Task[]
  weeklyGoals: WeeklyGoal[]
}

export interface WeeklyProgress {
  weekStart: string
  target: number
  actual: number
}

/** Applications that moved to "applied" within the current local week. */
export function weeklyProgress(data: ReminderData, now = new Date()): WeeklyProgress {
  const { start, end } = currentWeekRange(now)
  const weekStart = currentWeekStart(now)
  const goal = data.weeklyGoals.find(g => g.week_start === weekStart)
  const actual = data.applications.filter(a => {
    if (!a.applied_at) return false
    const t = new Date(a.applied_at).getTime()
    return t >= start.getTime() && t < end.getTime()
  }).length
  return { weekStart, target: goal?.target_apps ?? 5, actual }
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
    a => a.stage === 'wishlist' && daysUntil(a.created_at, now) <= -21
  )
}
