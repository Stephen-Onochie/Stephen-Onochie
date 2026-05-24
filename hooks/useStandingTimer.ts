'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  alertMessageForTransition,
  durationMinutesForMode,
  durationSecondsForMode,
  modeAtIndex,
} from '@/lib/standing-timer/cycle'
import {
  getNotificationSupport,
  showModeTransitionNotification,
} from '@/lib/standing-timer/notifications'
import { playChime } from '@/lib/standing-timer/sound'
import {
  computePeriodStats,
  sessionDurationSeconds,
} from '@/lib/standing-timer/stats'
import {
  completeInterval,
  completeSession,
  createInterval,
  createSession,
  deleteOpenIntervalsForSession,
  ensureTimerData,
  fetchAllIntervals,
  fetchOpenInterval,
  fetchSessionIntervalCount,
  fetchSessionIntervals,
  fetchSessionsWithIntervals,
  updateSettings,
  updateTimerState,
} from '@/lib/standing-timer/supabase'
import {
  advanceCycle,
  computeRemainingSeconds,
  getPlannedSecondsForState,
  idleStateDefaults,
} from '@/lib/standing-timer/timer-engine'
import type {
  IntervalCompleteAlert,
  PeriodStats,
  SessionWithIntervals,
  TimerInterval,
  TimerSettings,
  TimerState,
} from '@/types/standing-timer'

export function useStandingTimer() {
  const supabase = createClient()
  const [settings, setSettings] = useState<TimerSettings | null>(null)
  const [state, setState] = useState<TimerState | null>(null)
  const [openInterval, setOpenInterval] = useState<TimerInterval | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [plannedSeconds, setPlannedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [alert, setAlert] = useState<IntervalCompleteAlert | null>(null)
  const [stats, setStats] = useState<PeriodStats | null>(null)
  const [history, setHistory] = useState<SessionWithIntervals[]>([])
  const [sessionIntervalCount, setSessionIntervalCount] = useState(0)
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0)
  const [notificationPermission, setNotificationPermission] = useState<string>('default')

  const completingRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const stateRef = useRef<TimerState | null>(null)
  const settingsRef = useRef<TimerSettings | null>(null)
  const openIntervalRef = useRef<TimerInterval | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    openIntervalRef.current = openInterval
  }, [openInterval])

  const refreshStatsAndHistory = useCallback(async (userId: string) => {
    const [intervals, sessions] = await Promise.all([
      fetchAllIntervals(supabase, userId),
      fetchSessionsWithIntervals(supabase, userId),
    ])
    setStats(computePeriodStats(intervals, sessions))
    setHistory(sessions)
  }, [supabase])

  const syncDerivedValues = useCallback(
    (nextState: TimerState, nextSettings: TimerSettings, interval: TimerInterval | null) => {
      const planned = interval?.planned_seconds ?? getPlannedSecondsForState(nextState, nextSettings)
      setPlannedSeconds(planned)
      setRemainingSeconds(
        computeRemainingSeconds(nextState, planned)
      )
    },
    []
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      userIdRef.current = session.user.id
      setNotificationPermission(getNotificationSupport())

      const { settings: loadedSettings, state: loadedState } = await ensureTimerData(
        supabase,
        session.user.id
      )

      let interval: TimerInterval | null = null
      if (loadedState.session_id) {
        interval = await fetchOpenInterval(supabase, loadedState.session_id)
        const count = await fetchSessionIntervalCount(supabase, loadedState.session_id)
        setSessionIntervalCount(count)

        const sessionIntervals = await fetchSessionIntervals(supabase, loadedState.session_id)
        setSessionElapsedSeconds(sessionDurationSeconds(sessionIntervals))
      } else {
        setSessionIntervalCount(0)
        setSessionElapsedSeconds(0)
      }

      setSettings(loadedSettings)
      setState(loadedState)
      setOpenInterval(interval)
      syncDerivedValues(loadedState, loadedSettings, interval)
      await refreshStatsAndHistory(session.user.id)
    } catch (err) {
      console.error('Standing timer load failed:', err)
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : null
      if (message?.includes('does not exist')) {
        setError('Timer database tables are missing. Run the Supabase migration and refresh.')
      } else {
        setError(message ?? 'Failed to load timer. Is Supabase configured?')
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, refreshStatsAndHistory, syncDerivedValues])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const userId = userIdRef.current
    if (!userId) return

    const channel = supabase
      .channel(`workstation_timer_state:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workstation_timer_state',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const nextState = payload.new as TimerState
          setState(nextState)

          let interval = openIntervalRef.current
          if (nextState.session_id) {
            interval = await fetchOpenInterval(supabase, nextState.session_id)
            setOpenInterval(interval)
            const count = await fetchSessionIntervalCount(supabase, nextState.session_id)
            setSessionIntervalCount(count)
          }

          const currentSettings = settingsRef.current
          if (currentSettings) {
            syncDerivedValues(nextState, currentSettings, interval)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, syncDerivedValues])

  useEffect(() => {
    if (!state || state.status !== 'running') return

    const tick = () => {
      const currentState = stateRef.current
      const currentSettings = settingsRef.current
      const interval = openIntervalRef.current
      if (!currentState || !currentSettings) return

      const planned = interval?.planned_seconds ?? getPlannedSecondsForState(currentState, currentSettings)
      const remaining = computeRemainingSeconds(currentState, planned)
      setRemainingSeconds(remaining)

      if (remaining <= 0 && !completingRef.current) {
        void handleIntervalComplete()
      }
    }

    tick()
    const id = window.setInterval(tick, 1000)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status, state?.mode_started_at, state?.session_id])

  const handleIntervalComplete = useCallback(async () => {
    const userId = userIdRef.current
    const currentState = stateRef.current
    const currentSettings = settingsRef.current
    const interval = openIntervalRef.current

    if (!userId || !currentState || !currentSettings || !interval || !currentState.session_id) {
      return
    }

    if (completingRef.current) return
    completingRef.current = true

    try {
      const actualSeconds = interval.planned_seconds
      await completeInterval(supabase, interval.id, actualSeconds, true)

      const { nextMode, nextCycleIndex, nextPlannedSeconds } = advanceCycle(
        currentState.cycle_index,
        currentSettings
      )

      const nextInterval = await createInterval(
        supabase,
        userId,
        currentState.session_id,
        nextMode,
        nextPlannedSeconds
      )

      const now = new Date().toISOString()
      const nextState = await updateTimerState(supabase, userId, {
        current_mode: nextMode,
        cycle_index: nextCycleIndex,
        remaining_seconds: nextPlannedSeconds,
        mode_started_at: now,
        status: 'running',
      })

      setOpenInterval(nextInterval)
      setState(nextState)
      syncDerivedValues(nextState, currentSettings, nextInterval)
      setSessionIntervalCount((c) => c + 1)
      setSessionElapsedSeconds((s) => s + actualSeconds)

      const completedMode = interval.mode
      setAlert({
        completedMode,
        nextMode,
        nextDurationMinutes: durationMinutesForMode(nextMode, currentSettings),
      })

      if (currentSettings.sound_enabled) {
        void playChime()
      }

      if (currentSettings.notifications_enabled) {
        const message = alertMessageForTransition(completedMode, nextMode)
        showModeTransitionNotification(completedMode, nextMode, message)
      }

      await refreshStatsAndHistory(userId)
    } finally {
      completingRef.current = false
    }
  }, [supabase, refreshStatsAndHistory, syncDerivedValues])

  const start = useCallback(async () => {
    const userId = userIdRef.current
    const currentSettings = settingsRef.current
    const currentState = stateRef.current
    if (!userId || !currentSettings || !currentState || actionLoading) return

    setActionLoading(true)
    try {
      const session = await createSession(supabase, userId)
      const mode = modeAtIndex(0)
      const planned = durationSecondsForMode(mode, currentSettings)
      const interval = await createInterval(supabase, userId, session.id, mode, planned)
      const now = new Date().toISOString()

      const nextState = await updateTimerState(supabase, userId, {
        session_id: session.id,
        current_mode: mode,
        cycle_index: 0,
        remaining_seconds: planned,
        mode_started_at: now,
        status: 'running',
      })

      setOpenInterval(interval)
      setState(nextState)
      syncDerivedValues(nextState, currentSettings, interval)
      setSessionIntervalCount(0)
      setSessionElapsedSeconds(0)
      setAlert(null)
    } finally {
      setActionLoading(false)
    }
  }, [supabase, actionLoading, syncDerivedValues])

  const pause = useCallback(async () => {
    const userId = userIdRef.current
    const currentState = stateRef.current
    const currentSettings = settingsRef.current
    const interval = openIntervalRef.current
    if (!userId || !currentState || !currentSettings || currentState.status !== 'running') return

    setActionLoading(true)
    try {
      const planned = interval?.planned_seconds ?? getPlannedSecondsForState(currentState, currentSettings)
      const remaining = computeRemainingSeconds(currentState, planned)

      const nextState = await updateTimerState(supabase, userId, {
        remaining_seconds: remaining,
        mode_started_at: null,
        status: 'paused',
      })

      setState(nextState)
      setRemainingSeconds(remaining)
    } finally {
      setActionLoading(false)
    }
  }, [supabase])

  const resume = useCallback(async () => {
    const userId = userIdRef.current
    const currentState = stateRef.current
    if (!userId || !currentState || currentState.status !== 'paused') return

    setActionLoading(true)
    try {
      const elapsed = (openIntervalRef.current?.planned_seconds ?? currentState.remaining_seconds) - currentState.remaining_seconds
      const modeStartedAt = new Date(Date.now() - elapsed * 1000).toISOString()

      const nextState = await updateTimerState(supabase, userId, {
        mode_started_at: modeStartedAt,
        status: 'running',
      })

      setState(nextState)
    } finally {
      setActionLoading(false)
    }
  }, [supabase])

  const reset = useCallback(async () => {
    const userId = userIdRef.current
    const currentState = stateRef.current
    const currentSettings = settingsRef.current
    if (!userId || !currentState || !currentSettings) return

    setActionLoading(true)
    try {
      if (currentState.session_id) {
        await deleteOpenIntervalsForSession(supabase, currentState.session_id)
        await completeSession(supabase, currentState.session_id)
      }

      const defaults = idleStateDefaults(currentSettings)
      const nextState = await updateTimerState(supabase, userId, defaults)

      setOpenInterval(null)
      setState(nextState)
      syncDerivedValues(nextState, currentSettings, null)
      setSessionIntervalCount(0)
      setSessionElapsedSeconds(0)
      setAlert(null)
      await refreshStatsAndHistory(userId)
    } finally {
      setActionLoading(false)
    }
  }, [supabase, refreshStatsAndHistory, syncDerivedValues])

  const saveSettings = useCallback(
    async (
      updates: Partial<
        Pick<
          TimerSettings,
          | 'standing_minutes'
          | 'sitting_minutes'
          | 'break_minutes'
          | 'sound_enabled'
          | 'notifications_enabled'
        >
      >
    ) => {
      const userId = userIdRef.current
      const currentState = stateRef.current
      if (!userId || !currentState) return

      const nextSettings = await updateSettings(supabase, userId, updates)
      setSettings(nextSettings)

      if (currentState.status === 'idle') {
        const nextState = await updateTimerState(supabase, userId, {
          remaining_seconds: nextSettings.standing_minutes * 60,
          current_mode: 'standing',
          cycle_index: 0,
        })
        setState(nextState)
        syncDerivedValues(nextState, nextSettings, null)
      }
    },
    [supabase, syncDerivedValues]
  )

  const dismissAlert = useCallback(() => setAlert(null), [])

  const nextMode =
    state && settings
      ? modeAtIndex((state.cycle_index + 1) % 4)
      : 'sitting'

  const nextDurationMinutes =
    settings && nextMode ? durationMinutesForMode(nextMode, settings) : 0

  return {
    settings,
    state,
    remainingSeconds,
    plannedSeconds,
    loading,
    error,
    actionLoading,
    alert,
    stats,
    history,
    sessionIntervalCount,
    sessionElapsedSeconds,
    notificationPermission,
    nextMode,
    nextDurationMinutes,
    start,
    pause,
    resume,
    reset,
    saveSettings,
    dismissAlert,
    refreshStatsAndHistory: () => {
      const userId = userIdRef.current
      if (userId) return refreshStatsAndHistory(userId)
      return Promise.resolve()
    },
  }
}
