export interface FastSession {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_hrs: number | null
  notes: string | null
  created_at: string
}

export interface FastSettings {
  user_id: string
  cooldown_days: number
  target_duration_hrs: number
  fast_label: string
  notes_prompt: string
  created_at: string
  updated_at: string
}
