import type { Todo, Recurrence } from '@/types/todo'

// Pure weekly-review computation. Streaks are derived from completion history
// (no stored streak column). "This week" = the last 7 days ending now.

export interface WeeklyReview {
  completedCount: number
  slipped: Todo[] // incomplete + overdue
  upcomingRecurring: number // recurrences whose next occurrence is in the next 7 days
  habitStreaks: { title: string; streak: number }[]
}

function daysAgo(n: number, now: Date): Date {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return d
}

// Longest run of consecutive days (ending today or yesterday) on which a task
// with this title was completed. Groups recurring habit instances by title.
function computeStreak(dates: Date[], now: Date): number {
  if (!dates.length) return 0
  const days = new Set(dates.map(d => d.toDateString()))
  // Allow the streak to be "current" if done today or yesterday.
  let cursor = new Date(now)
  if (!days.has(cursor.toDateString())) {
    cursor = daysAgo(1, now)
    if (!days.has(cursor.toDateString())) return 0
  }
  let streak = 0
  while (days.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function computeWeeklyReview(
  todos: Todo[],
  recurrences: Recurrence[],
  now: Date = new Date()
): WeeklyReview {
  const weekStart = daysAgo(7, now)

  const completedCount = todos.filter(
    t => t.completed && t.completed_at && new Date(t.completed_at) >= weekStart
  ).length

  const slipped = todos.filter(
    t => !t.completed && t.due_at && new Date(t.due_at) < now
  )

  const in7 = daysAgo(-7, now)
  const upcomingRecurring = recurrences.filter(
    r => r.active && r.next_occurrence && new Date(r.next_occurrence) <= in7 && new Date(r.next_occurrence) >= now
  ).length

  // Habit streaks: group recurring-task completions by title.
  const recurringIds = new Set(recurrences.map(r => r.id))
  const byTitle = new Map<string, Date[]>()
  for (const t of todos) {
    if (!t.completed || !t.completed_at) continue
    if (!t.recurrence_id || !recurringIds.has(t.recurrence_id)) continue
    const list = byTitle.get(t.title) ?? []
    list.push(new Date(t.completed_at))
    byTitle.set(t.title, list)
  }
  const habitStreaks = Array.from(byTitle.entries())
    .map(([title, dates]) => ({ title, streak: computeStreak(dates, now) }))
    .filter(h => h.streak > 0)
    .sort((a, b) => b.streak - a.streak)

  return { completedCount, slipped, upcomingRecurring, habitStreaks }
}

// Sunday in the site's Eastern day sense is good enough via local Sunday here;
// the card is always available but highlighted on Sundays.
export function isSunday(now: Date = new Date()): boolean {
  return now.getDay() === 0
}
