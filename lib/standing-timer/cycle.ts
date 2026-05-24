import type { TimerSettings, WorkstationMode } from '@/types/standing-timer'

export const CYCLE: WorkstationMode[] = ['standing', 'sitting', 'standing', 'break']

export const MODE_LABELS: Record<WorkstationMode, string> = {
  standing: 'Standing',
  sitting: 'Sitting',
  break: 'Break',
}

export const MODE_ICONS: Record<WorkstationMode, string> = {
  standing: '🧍',
  sitting: '🪑',
  break: '☕',
}

export const MODE_COLORS: Record<WorkstationMode, string> = {
  standing: '#C9A84C',
  sitting: '#6B4F2A',
  break: '#8C7355',
}

export function nextCycleIndex(index: number): number {
  return (index + 1) % CYCLE.length
}

export function modeAtIndex(index: number): WorkstationMode {
  return CYCLE[index]
}

export function durationSecondsForMode(
  mode: WorkstationMode,
  settings: Pick<TimerSettings, 'standing_minutes' | 'sitting_minutes' | 'break_minutes'>
): number {
  switch (mode) {
    case 'standing':
      return settings.standing_minutes * 60
    case 'sitting':
      return settings.sitting_minutes * 60
    case 'break':
      return settings.break_minutes * 60
  }
}

export function durationMinutesForMode(
  mode: WorkstationMode,
  settings: Pick<TimerSettings, 'standing_minutes' | 'sitting_minutes' | 'break_minutes'>
): number {
  switch (mode) {
    case 'standing':
      return settings.standing_minutes
    case 'sitting':
      return settings.sitting_minutes
    case 'break':
      return settings.break_minutes
  }
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDurationHuman(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

export function alertMessageForTransition(
  completedMode: WorkstationMode,
  nextMode: WorkstationMode
): string {
  const next = MODE_LABELS[nextMode].toLowerCase()
  switch (completedMode) {
    case 'standing':
      return `Standing time is up — time to ${next}.`
    case 'sitting':
      return `Sitting time is up — time to ${next}.`
    case 'break':
      return `Break is over — time to ${next}.`
  }
}
