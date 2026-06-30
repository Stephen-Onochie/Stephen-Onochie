// Week math for the tracker. Weeks start Monday (matches the seeded week_start
// dates). "Today"/"this week" resolve in Eastern time (the whole site is pinned
// to America/New_York via lib/dates.ts), while the date-math helpers operate on
// the wall-clock parts of whatever Date they're handed.

import { easternMonday, easternWeekday } from '@/lib/dates'

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday of the week containing `d`, as a YYYY-MM-DD string. */
export function mondayOf(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = copy.getDay() // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow
  copy.setDate(copy.getDate() + diff)
  return toLocalDateString(copy)
}

/** Monday (Eastern) of the current week, as a YYYY-MM-DD string. */
export function currentWeekStart(now: Date = new Date()): string {
  return easternMonday(now)
}

/** Whole days from now until `iso` (negative = overdue). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso)
  const ms = target.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function isOverdue(iso: string | null, now: Date = new Date()): boolean {
  if (!iso) return false
  return new Date(iso).getTime() < now.getTime()
}

/** Inclusive [start, end] of the current Eastern week (Mon 00:00 → next Mon 00:00). */
export function currentWeekRange(now: Date = new Date()): { start: Date; end: Date } {
  const monStr = easternMonday(now)
  const [y, m, d] = monStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export function isSunday(now: Date = new Date()): boolean {
  return easternWeekday(now) === 0
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
