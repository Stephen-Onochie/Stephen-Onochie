import type { ModeStats, PeriodStats, TimerInterval, TimerSession } from '@/types/standing-timer'

function emptyStats(): ModeStats {
  return { standing: 0, sitting: 0, break: 0 }
}

function addIntervalToStats(stats: ModeStats, interval: TimerInterval): ModeStats {
  const seconds = interval.actual_seconds ?? interval.planned_seconds
  return {
    ...stats,
    [interval.mode]: stats[interval.mode] + seconds,
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

function filterIntervalsSince(intervals: TimerInterval[], since: Date): TimerInterval[] {
  return intervals.filter((i) => new Date(i.started_at) >= since)
}

export function computePeriodStats(
  intervals: TimerInterval[],
  sessions: TimerSession[]
): PeriodStats {
  const completed = intervals.filter((i) => i.completed && i.ended_at)
  const now = new Date()

  const allTime = completed.reduce(addIntervalToStats, emptyStats())
  const today = filterIntervalsSince(completed, startOfDay(now)).reduce(addIntervalToStats, emptyStats())
  const thisWeek = filterIntervalsSince(completed, startOfWeek(now)).reduce(addIntervalToStats, emptyStats())
  const thisMonth = filterIntervalsSince(completed, startOfMonth(now)).reduce(addIntervalToStats, emptyStats())

  return {
    allTime,
    today,
    thisWeek,
    thisMonth,
    sessionCount: sessions.length,
    intervalCount: completed.length,
  }
}

export function totalSeconds(stats: ModeStats): number {
  return stats.standing + stats.sitting + stats.break
}

export function formatHoursMinutes(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function sessionDurationSeconds(intervals: TimerInterval[]): number {
  return intervals
    .filter((i) => i.ended_at)
    .reduce((sum, i) => sum + (i.actual_seconds ?? i.planned_seconds), 0)
}
