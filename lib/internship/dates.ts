// Week math for the tracker. Weeks start Monday (matches the seeded week_start
// dates). All "local date" helpers use the runtime's local timezone, consistent
// with how the rest of the private apps stamp session_date.

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday (local) of the week containing `d`, as a YYYY-MM-DD string. */
export function mondayOf(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = copy.getDay() // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow
  copy.setDate(copy.getDate() + diff)
  return toLocalDateString(copy)
}

export function currentWeekStart(now: Date = new Date()): string {
  return mondayOf(now)
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

/** Inclusive [start, end] of the current local week (Mon 00:00 → next Mon 00:00). */
export function currentWeekRange(now: Date = new Date()): { start: Date; end: Date } {
  const monStr = mondayOf(now)
  const [y, m, d] = monStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export function isSunday(now: Date = new Date()): boolean {
  return now.getDay() === 0
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
