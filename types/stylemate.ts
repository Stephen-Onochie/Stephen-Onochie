export type ApparelCategory = 'top' | 'bottom' | 'outerwear' | 'footwear' | 'accessory' | 'jewelry' | 'eyewear' | 'bag'
export type StyleMateTab = 'closet' | 'outfits' | 'stylist'
export type ItemSource = 'scan' | 'gmail' | 'manual'
export type JobStatus = 'none' | 'pending' | 'done' | 'failed'
export type OutfitSlot = 'class' | 'casual' | 'gym' | 'going_out' | 'custom'
export type OutfitOrigin = 'weekly' | 'daily' | 'custom'
export type OutfitImageKind = 'flatlay' | 'model'

export interface WardrobeItem {
  id: string
  user_id: string
  name: string
  category: ApparelCategory
  sub_type: string | null
  color: string
  color_hex: string | null
  colors: string[]
  pattern: string | null
  material: string | null
  fit: string | null
  brand: string | null
  size: string | null
  description: string | null
  formality: number
  warmth: number
  seasons: string[]
  occasions: string[]
  style_tags: string[]
  min_temp_threshold: number
  max_temp_threshold: number
  is_incoming: boolean
  image_url: string | null
  render_path: string | null
  render_status: JobStatus
  source: ItemSource
  source_ref: string | null
  retailer: string | null
  product_url: string | null
  price: number | null
  ordered_at: string | null
  wear_count: number
  last_worn_on: string | null
  created_at: string
  updated_at: string
}

export interface WardrobeItemView extends WardrobeItem {
  photo_url: string | null
  render_url: string | null
}

/** Attributes Claude assigns to one garment. Mirrors the editable item columns. */
export interface ItemTags {
  name: string
  category: ApparelCategory
  sub_type: string
  color: string
  color_hex: string
  colors: string[]
  pattern: string
  material: string
  fit: string
  brand: string | null
  description: string
  formality: number
  warmth: number
  seasons: string[]
  occasions: string[]
  style_tags: string[]
  min_temp_threshold: number
  max_temp_threshold: number
}

export interface DayWeather {
  date: string
  highF: number
  lowF: number
  precipChance: number
  condition: string
  location: string
}

export interface Outfit {
  id: string
  user_id: string
  plan_date: string | null
  slot: OutfitSlot
  origin: OutfitOrigin
  week_start: string | null
  title: string
  occasion: string | null
  palette: string | null
  item_ids: string[]
  reasoning: string | null
  styling_tip: string | null
  weather: DayWeather | null
  image_path: string | null
  image_status: JobStatus
  model_image_path: string | null
  model_image_status: JobStatus
  saved: boolean
  worn_on: string | null
  created_at: string
}

export interface OutfitView extends Outfit {
  image_url: string | null
  model_image_url: string | null
}

export interface OutfitRequest {
  date: string
  occasion: string
  palette?: string | null
  slot?: OutfitSlot
  weather?: DayWeather | null
  count?: number
  notes?: string | null
}

export interface StylistMessage {
  role: 'user' | 'assistant'
  text: string
}

export interface StylistThread {
  id: string
  title: string
  messages: StylistMessage[]
  updated_at: string
}

export interface GmailOrderLine {
  name: string
  brand?: string | null
  color?: string | null
  size?: string | null
  price?: number | null
  image_url?: string | null
  product_url?: string | null
  category_hint?: string | null
}

export interface GmailOrder {
  message_id: string
  retailer: string
  ordered_at?: string | null
  lines: GmailOrderLine[]
}
