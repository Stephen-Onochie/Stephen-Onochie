import type { SupabaseClient } from '@supabase/supabase-js'
import { advanceCycle } from '@/lib/standing-timer/timer-engine'
import {
  completeInterval,
  createInterval,
  fetchOpenInterval,
} from '@/lib/standing-timer/supabase'
import type {
  TimerInterval,
  TimerSettings,
  TimerState,
  WorkstationMode,
} from '@/types/standing-timer'

export interface AdvanceOutcome {
  nextState: TimerState
  nextInterval: TimerInterval
  completedMode: WorkstationMode
  actualSeconds: number
}

// Performs the "interval finished → advance to the next mode" write.
//
// Both the timer page (useStandingTimer) and the shell-wide engine
// (useStandingTimerEngine) call this, so it must be safe when more than one
// ticker fires at the same moment. The state UPDATE is a compare-and-set on
// mode_started_at: whichever ticker writes first claims the interval, and any
// concurrent caller's UPDATE matches zero rows and returns null. That makes the
// advance idempotent across tabs, pages, and devices, so the cycle never skips
// a step or fires two transitions.
export async function advanceInterval(
  supabase: SupabaseClient,
  userId: string,
  state: TimerState,
  settings: TimerSettings,
  interval: TimerInterval
): Promise<AdvanceOutcome | null> {
  if (!state.session_id || !state.mode_started_at) return null

  const { nextMode, nextCycleIndex, nextPlannedSeconds } = advanceCycle(
    state.cycle_index,
    settings
  )

  const now = new Date().toISOString()

  // Compare-and-set: only the first ticker whose claim still matches the row's
  // current mode_started_at wins. maybeSingle() returns null for the losers.
  const { data: nextStateRow, error: stateError } = await supabase
    .from('workstation_timer_state')
    .update({
      current_mode: nextMode,
      cycle_index: nextCycleIndex,
      remaining_seconds: nextPlannedSeconds,
      mode_started_at: now,
      status: 'running',
      updated_at: now,
    })
    .eq('user_id', userId)
    .eq('mode_started_at', state.mode_started_at)
    .eq('status', 'running')
    .select('*')
    .maybeSingle()

  if (stateError) throw stateError
  if (!nextStateRow) return null

  const actualSeconds = interval.planned_seconds

  // We won the claim, so we own the interval bookkeeping for this transition.
  await completeInterval(supabase, interval.id, actualSeconds, true)
  const nextInterval = await createInterval(
    supabase,
    userId,
    state.session_id,
    nextMode,
    nextPlannedSeconds
  )

  return {
    nextState: nextStateRow as TimerState,
    nextInterval,
    completedMode: interval.mode,
    actualSeconds,
  }
}

// Convenience for callers (the engine) that hold a state row but not the open
// interval — fetches it, then advances.
export async function advanceFromState(
  supabase: SupabaseClient,
  userId: string,
  state: TimerState,
  settings: TimerSettings
): Promise<AdvanceOutcome | null> {
  if (!state.session_id) return null
  const interval = await fetchOpenInterval(supabase, state.session_id)
  if (!interval) return null
  return advanceInterval(supabase, userId, state, settings, interval)
}
