export type SessionType = 'morning' | 'afternoon' | 'evening' | 'wash'

export interface WavesSession {
  id: string
  user_id: string
  session_type: SessionType
  brushing_seconds: number
  session_date: string
  completed_at: string
}

export interface WavesSettings {
  user_id: string
  wash_day: number
  last_haircut_date: string
  haircut_interval_weeks: number
  morning_duration_mins: number
  afternoon_duration_mins: number
  evening_duration_mins: number
  created_at: string
  updated_at: string
}
