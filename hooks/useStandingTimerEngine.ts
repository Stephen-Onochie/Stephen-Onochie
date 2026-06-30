'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { alertMessageForTransition } from '@/lib/standing-timer/cycle'
import { showModeTransitionNotification } from '@/lib/standing-timer/notifications'
import { playChime } from '@/lib/standing-timer/sound'
import { advanceFromState } from '@/lib/standing-timer/advance'
import {
  computeRemainingSeconds,
  getPlannedSecondsForState,
} from '@/lib/standing-timer/timer-engine'
import type { TimerSettings, TimerState } from '@/types/standing-timer'

// Shell-wide Standing Timer engine.
//
// The timer page's tick loop only runs while that page is mounted, so when the
// user is in another IVEN app nothing advances the cycle and no toast can fire.
// This hook lives in IvenShell and runs everywhere: it watches the timer state
// via realtime, ticks once per second while a session is running, and performs
// the advance write when an interval expires. The advance is a compare-and-set
// (see lib/standing-timer/advance.ts), so when the timer page is also open both
// tickers race harmlessly — exactly one write lands.
//
// Q2 decision: a full alert fires everywhere — chime + OS notification (both
// gated by the user's existing settings) in addition to the visual toast that
// useStandingTimerEventToast renders off the same realtime UPDATE.
export function useStandingTimerEngine() {
  const supabase = createClient()
  const userIdRef = useRef<string | null>(null)
  const stateRef = useRef<TimerState | null>(null)
  const settingsRef = useRef<TimerSettings | null>(null)
  const advancingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    let intervalId: number | null = null

    const fireAlert = (completedMode: TimerState['current_mode'], nextMode: TimerState['current_mode']) => {
      const settings = settingsRef.current
      if (!settings) return
      if (settings.sound_enabled) void playChime()
      if (settings.notifications_enabled) {
        showModeTransitionNotification(
          completedMode,
          nextMode,
          alertMessageForTransition(completedMode, nextMode)
        )
      }
    }

    const maybeAdvance = async () => {
      const userId = userIdRef.current
      const state = stateRef.current
      const settings = settingsRef.current
      if (!userId || !state || !settings) return
      if (state.status !== 'running' || !state.mode_started_at) return
      if (advancingRef.current) return

      const planned = getPlannedSecondsForState(state, settings)
      const remaining = computeRemainingSeconds(state, planned)
      if (remaining > 0) return

      advancingRef.current = true
      try {
        const outcome = await advanceFromState(supabase, userId, state, settings)
        // Optimistically reflect the win so the next tick uses the new interval.
        // Losers (outcome === null) just wait for the realtime UPDATE.
        if (outcome) {
          stateRef.current = outcome.nextState
          fireAlert(outcome.completedMode, outcome.nextState.current_mode)
        }
      } catch (err) {
        console.error('Standing timer engine advance failed:', err)
      } finally {
        advancingRef.current = false
      }
    }

    const ensureTicking = () => {
      if (intervalId !== null) return
      intervalId = window.setInterval(() => void maybeAdvance(), 1000)
    }

    const stopTicking = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
    }

    const start = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session || cancelled) return
      const userId = session.user.id
      userIdRef.current = userId

      const [{ data: stateRow }, { data: settingsRow }] = await Promise.all([
        supabase
          .from('workstation_timer_state')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('workstation_timer_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
      ])
      if (cancelled) return

      stateRef.current = (stateRow as TimerState | null) ?? null
      settingsRef.current = (settingsRow as TimerSettings | null) ?? null
      if (stateRef.current?.status === 'running') ensureTicking()

      channel = supabase
        .channel(`standing_timer_engine:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'workstation_timer_state',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            stateRef.current = payload.new as TimerState
            if (stateRef.current.status === 'running') ensureTicking()
            else stopTicking()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'workstation_timer_settings',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            settingsRef.current = payload.new as TimerSettings
          }
        )
        .subscribe()
    }

    void start()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void maybeAdvance()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      stopTicking()
      document.removeEventListener('visibilitychange', onVisibility)
      if (channel) supabase.removeChannel(channel)
    }
  // createClient returns a stable singleton; run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
