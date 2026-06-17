export type SessionType = 'morning' | 'afternoon' | 'evening' | 'wash'

export type BrushType = 'comb' | 'hard' | 'medium' | 'soft'

export const WAVE_ANGLES = ['Top', 'Right', 'Left', 'Back', 'Crown'] as const
export type WaveAngle = (typeof WAVE_ANGLES)[number]

export type SessionStep =
  | { kind: 'plain'; text: string }
  | { kind: 'timed'; text: string; durationSecs: number }
  | { kind: 'brush'; text: string; brush: BrushType; strokesPerAngle: number }

export type StrokeLog = Record<string, Partial<Record<WaveAngle, number>>>

export interface WavesSession {
  id: string
  user_id: string
  session_type: SessionType
  brushing_seconds: number
  session_date: string
  completed_at: string
  stroke_log: StrokeLog | null
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
