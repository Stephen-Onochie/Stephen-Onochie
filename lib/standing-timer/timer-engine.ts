import type { TimerSettings, TimerState, WorkstationMode } from '@/types/standing-timer'
import {
  durationSecondsForMode,
  modeAtIndex,
  nextCycleIndex,
} from '@/lib/standing-timer/cycle'

export function computeRemainingSeconds(
  state: Pick<TimerState, 'status' | 'remaining_seconds' | 'mode_started_at' | 'current_mode'>,
  plannedSeconds: number,
  nowMs: number = Date.now()
): number {
  if (state.status === 'idle') {
    return state.remaining_seconds
  }

  if (state.status === 'paused') {
    return Math.max(0, state.remaining_seconds)
  }

  if (!state.mode_started_at) {
    return Math.max(0, state.remaining_seconds)
  }

  const elapsed = Math.floor((nowMs - new Date(state.mode_started_at).getTime()) / 1000)
  return Math.max(0, plannedSeconds - elapsed)
}

export function computeProgress(
  remainingSeconds: number,
  plannedSeconds: number
): number {
  if (plannedSeconds <= 0) return 0
  const elapsed = plannedSeconds - remainingSeconds
  return Math.min(1, Math.max(0, elapsed / plannedSeconds))
}

export function getPlannedSecondsForState(
  state: Pick<TimerState, 'current_mode'>,
  settings: Pick<TimerSettings, 'standing_minutes' | 'sitting_minutes' | 'break_minutes'>
): number {
  return durationSecondsForMode(state.current_mode, settings)
}

export interface AdvanceResult {
  nextMode: WorkstationMode
  nextCycleIndex: number
  nextPlannedSeconds: number
}

export function advanceCycle(
  currentCycleIndex: number,
  settings: Pick<TimerSettings, 'standing_minutes' | 'sitting_minutes' | 'break_minutes'>
): AdvanceResult {
  const nextIndex = nextCycleIndex(currentCycleIndex)
  const nextMode = modeAtIndex(nextIndex)
  return {
    nextMode,
    nextCycleIndex: nextIndex,
    nextPlannedSeconds: durationSecondsForMode(nextMode, settings),
  }
}

export function idleStateDefaults(
  settings: Pick<TimerSettings, 'standing_minutes'>
): Pick<TimerState, 'current_mode' | 'cycle_index' | 'remaining_seconds' | 'status' | 'session_id' | 'mode_started_at'> {
  return {
    session_id: null,
    current_mode: 'standing',
    cycle_index: 0,
    remaining_seconds: settings.standing_minutes * 60,
    mode_started_at: null,
    status: 'idle',
  }
}
