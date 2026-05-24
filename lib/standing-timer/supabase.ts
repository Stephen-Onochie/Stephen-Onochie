import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  TimerInterval,
  TimerSession,
  TimerSettings,
  TimerState,
} from '@/types/standing-timer'

const DEFAULT_SETTINGS: Omit<TimerSettings, 'user_id' | 'updated_at'> = {
  standing_minutes: 20,
  sitting_minutes: 10,
  break_minutes: 5,
  sound_enabled: true,
  notifications_enabled: true,
}

export async function ensureTimerData(
  supabase: SupabaseClient,
  userId: string
): Promise<{ settings: TimerSettings; state: TimerState }> {
  const { data: settingsRow } = await supabase
    .from('workstation_timer_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  let settings = settingsRow as TimerSettings | null

  if (!settings) {
    const { data, error } = await supabase
      .from('workstation_timer_settings')
      .insert({ user_id: userId, ...DEFAULT_SETTINGS })
      .select('*')
      .single()

    if (error) throw error
    settings = data as TimerSettings
  }

  const { data: stateRow } = await supabase
    .from('workstation_timer_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  let state = stateRow as TimerState | null

  if (!state) {
    const { data, error } = await supabase
      .from('workstation_timer_state')
      .insert({
        user_id: userId,
        current_mode: 'standing',
        cycle_index: 0,
        remaining_seconds: settings.standing_minutes * 60,
        status: 'idle',
      })
      .select('*')
      .single()

    if (error) throw error
    state = data as TimerState
  }

  return { settings, state }
}

export async function updateSettings(
  supabase: SupabaseClient,
  userId: string,
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
): Promise<TimerSettings> {
  const { data, error } = await supabase
    .from('workstation_timer_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw error
  return data as TimerSettings
}

export async function updateTimerState(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<
    Pick<
      TimerState,
      | 'session_id'
      | 'current_mode'
      | 'cycle_index'
      | 'remaining_seconds'
      | 'mode_started_at'
      | 'status'
    >
  >
): Promise<TimerState> {
  const { data, error } = await supabase
    .from('workstation_timer_state')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw error
  return data as TimerState
}

export async function createSession(
  supabase: SupabaseClient,
  userId: string
): Promise<TimerSession> {
  const { data, error } = await supabase
    .from('workstation_timer_sessions')
    .insert({ user_id: userId, status: 'active' })
    .select('*')
    .single()

  if (error) throw error
  return data as TimerSession
}

export async function completeSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('workstation_timer_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function createInterval(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  mode: TimerInterval['mode'],
  plannedSeconds: number
): Promise<TimerInterval> {
  const { data, error } = await supabase
    .from('workstation_timer_intervals')
    .insert({
      user_id: userId,
      session_id: sessionId,
      mode,
      planned_seconds: plannedSeconds,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error
  return data as TimerInterval
}

export async function completeInterval(
  supabase: SupabaseClient,
  intervalId: string,
  actualSeconds: number,
  completed: boolean
): Promise<void> {
  const { error } = await supabase
    .from('workstation_timer_intervals')
    .update({
      ended_at: new Date().toISOString(),
      actual_seconds: actualSeconds,
      completed,
    })
    .eq('id', intervalId)

  if (error) throw error
}

export async function deleteOpenIntervalsForSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('workstation_timer_intervals')
    .delete()
    .eq('session_id', sessionId)
    .is('ended_at', null)

  if (error) throw error
}

export async function fetchOpenInterval(
  supabase: SupabaseClient,
  sessionId: string
): Promise<TimerInterval | null> {
  const { data, error } = await supabase
    .from('workstation_timer_intervals')
    .select('*')
    .eq('session_id', sessionId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as TimerInterval | null) ?? null
}

export async function fetchSessionsWithIntervals(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<Array<TimerSession & { intervals: TimerInterval[] }>> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('workstation_timer_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (sessionsError) throw sessionsError
  if (!sessions?.length) return []

  const sessionIds = sessions.map((s) => s.id)
  const { data: intervals, error: intervalsError } = await supabase
    .from('workstation_timer_intervals')
    .select('*')
    .in('session_id', sessionIds)
    .order('started_at', { ascending: true })

  if (intervalsError) throw intervalsError

  const intervalsBySession = new Map<string, TimerInterval[]>()
  for (const interval of (intervals ?? []) as TimerInterval[]) {
    const list = intervalsBySession.get(interval.session_id) ?? []
    list.push(interval)
    intervalsBySession.set(interval.session_id, list)
  }

  return (sessions as TimerSession[]).map((session) => ({
    ...session,
    intervals: intervalsBySession.get(session.id) ?? [],
  }))
}

export async function fetchAllIntervals(
  supabase: SupabaseClient,
  userId: string
): Promise<TimerInterval[]> {
  const { data, error } = await supabase
    .from('workstation_timer_intervals')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })

  if (error) throw error
  return (data as TimerInterval[]) ?? []
}

export async function fetchSessionIntervals(
  supabase: SupabaseClient,
  sessionId: string
): Promise<TimerInterval[]> {
  const { data, error } = await supabase
    .from('workstation_timer_intervals')
    .select('*')
    .eq('session_id', sessionId)
    .order('started_at', { ascending: true })

  if (error) throw error
  return (data as TimerInterval[]) ?? []
}

export async function fetchSessionIntervalCount(
  supabase: SupabaseClient,
  sessionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('workstation_timer_intervals')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .not('ended_at', 'is', null)

  if (error) throw error
  return count ?? 0
}
