export type ApparelCategory = 'top' | 'bottom' | 'outerwear' | 'footwear' | 'accessory'
export type LaundryStatus = 'clean' | 'dirty' | 'laundry_cycle'
export type StyleMateTab = 'closet' | 'add' | 'incoming'
export type WardrobeArchetype = 'gym_grind' | 'client_meeting' | 'old_money' | 'casual_weekend'

export interface WardrobeItem {
  id: string
  user_id: string
  name: string
  category: ApparelCategory
  sub_type: string | null
  color: string
  min_temp_threshold: number
  max_temp_threshold: number
  archetype: string
  status: LaundryStatus
  is_incoming: boolean
  image_url: string | null
  created_at: string
}

export interface WardrobeItemInsert {
  name: string
  category: ApparelCategory
  sub_type?: string | null
  color: string
  min_temp_threshold?: number
  max_temp_threshold?: number
  archetype?: string
  status?: LaundryStatus
  is_incoming?: boolean
  image_url?: string | null
}

export interface GeminiTagResult {
  name: string
  category: ApparelCategory
  sub_type: string
  color: string
  min_temp_threshold: number
  max_temp_threshold: number
  archetype: WardrobeArchetype
}

export interface WardrobeItemWithSignedUrl extends WardrobeItem {
  signed_image_url?: string | null
}
