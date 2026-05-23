export type BubbleType = 'idea' | 'purchase' | 'goal' | 'question'

export interface Bubble {
  id: string
  user_id: string
  title: string
  body: string | null
  type: BubbleType
  expires_at: string
  saved: boolean
  created_at: string
}
