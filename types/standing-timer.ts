export type WorkstationMode = 'standing' | 'sitting' | 'break'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type SessionStatus = 'active' | 'completed'

export interface TimerSettings {
  user_id: string
  standing_minutes: number
  sitting_minutes: number
  break_minutes: number
  sound_enabled: boolean
  notifications_enabled: boolean
  updated_at: string
}

export interface TimerSession {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  status: SessionStatus
}

export interface TimerInterval {
  id: string
  user_id: string
  session_id: string
  mode: WorkstationMode
  planned_seconds: number
  actual_seconds: number | null
  started_at: string
  ended_at: string | null
  completed: boolean
}

export interface TimerState {
  user_id: string
  session_id: string | null
  current_mode: WorkstationMode
  cycle_index: number
  remaining_seconds: number
  mode_started_at: string | null
  status: TimerStatus
  updated_at: string
}

export interface ModeStats {
  standing: number
  sitting: number
  break: number
}

export interface PeriodStats {
  allTime: ModeStats
  today: ModeStats
  thisWeek: ModeStats
  thisMonth: ModeStats
  sessionCount: number
  intervalCount: number
}

export interface SessionWithIntervals extends TimerSession {
  intervals: TimerInterval[]
}

export type StandingTimerTab = 'timer' | 'stats' | 'history' | 'settings'

export interface IntervalCompleteAlert {
  completedMode: WorkstationMode
  nextMode: WorkstationMode
  nextDurationMinutes: number
}
