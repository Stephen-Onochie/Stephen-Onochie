import { easternWeekday } from '@/lib/dates'

// With this few days left in the week, a manual plan also covers next week.
const EXTEND_WHEN_DAYS_LEFT_AT_MOST = 2

/** Days a plan made today covers: through Saturday, or the following Saturday late in the week. */
export function planLength(weekday: number = easternWeekday()): number {
  const daysLeft = 7 - weekday
  return daysLeft <= EXTEND_WHEN_DAYS_LEFT_AT_MOST ? daysLeft + 7 : daysLeft
}
