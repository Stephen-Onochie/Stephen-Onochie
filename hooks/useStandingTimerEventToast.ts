'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MODE_ICONS, MODE_LABELS, alertMessageForTransition } from '@/lib/standing-timer/cycle'
import type { TimerState, WorkstationMode } from '@/types/standing-timer'

export interface StandingTimerToast {
  id: number
  completedMode: WorkstationMode
  nextMode: WorkstationMode
  message: string
}

// Global, lightweight listener for Standing Timer "the timer went off" events.
// Subscribes to the same realtime channel the timer page uses so the toast can
// surface on the dashboard or any other backend page, not just /apps/standing-timer.
// The active timer page is what actually advances the cycle and writes the new
// state; here we only react to those writes to render an ambient notification.
export function useStandingTimerEventToast() {
  const [toast, setToast] = useState<StandingTimerToast | null>(null)
  const lastModeRef = useRef<WorkstationMode | null>(null)
  const lastStatusRef = useRef<TimerState['status'] | null>(null)
  const toastIdRef = useRef(0)
  const dismissTimerRef = useRef<number | null>(null)

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
    setToast(null)
  }, [])

  const show = useCallback(
    (completedMode: WorkstationMode, nextMode: WorkstationMode) => {
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current)
      toastIdRef.current += 1
      setToast({
        id: toastIdRef.current,
        completedMode,
        nextMode,
        message: alertMessageForTransition(completedMode, nextMode),
      })
      dismissTimerRef.current = window.setTimeout(() => {
        setToast(null)
        dismissTimerRef.current = null
      }, 12000)
    },
    []
  )

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    const start = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session || cancelled) return
      const userId = session.user.id

      // Seed the baseline from the current state so a refresh mid-interval
      // doesn't fire a spurious toast.
      const { data: current } = await supabase
        .from('workstation_timer_state')
        .select('current_mode, status')
        .eq('user_id', userId)
        .maybeSingle()
      if (current) {
        lastModeRef.current = current.current_mode as WorkstationMode
        lastStatusRef.current = current.status as TimerState['status']
      }

      channel = supabase
        .channel(`standing_timer_toast:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'workstation_timer_state',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new as TimerState
            const prevMode = lastModeRef.current
            const prevStatus = lastStatusRef.current

            // A timer "goes off" when the cycle advances to a new mode while the
            // session was already running. Starting from idle (the first start)
            // changes status, not mode mid-run, so it doesn't fire here.
            const wentOff =
              prevMode !== null &&
              prevStatus === 'running' &&
              next.status === 'running' &&
              next.current_mode !== prevMode &&
              next.session_id !== null

            lastModeRef.current = next.current_mode
            lastStatusRef.current = next.status

            if (wentOff) {
              show(prevMode as WorkstationMode, next.current_mode)
            }
          }
        )
        .subscribe()
    }

    void start()

    return () => {
      cancelled = true
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current)
      if (channel) supabase.removeChannel(channel)
    }
  }, [show])

  return { toast, dismiss }
}

export { MODE_ICONS, MODE_LABELS }
