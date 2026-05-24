import type { ApparelCategory, LaundryStatus, WardrobeArchetype } from '@/types/stylemate'

export const APPAREL_CATEGORIES: { value: ApparelCategory; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'footwear', label: 'Footwear' },
  { value: 'accessory', label: 'Accessory' },
]

export const LAUNDRY_STATUSES: { value: LaundryStatus; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'laundry_cycle', label: 'In Laundry' },
]

export const ARCHETYPES: { value: WardrobeArchetype; label: string }[] = [
  { value: 'casual_weekend', label: 'Casual Weekend' },
  { value: 'gym_grind', label: 'Gym / Grind' },
  { value: 'client_meeting', label: 'Client Meeting' },
  { value: 'old_money', label: 'Old Money' },
]

export const WARDROBE_IMAGES_BUCKET = 'wardrobe-images'

export const LAUNDRY_WARNING_THRESHOLD = 2
