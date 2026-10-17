import type { ApparelCategory, OutfitSlot } from '@/types/stylemate'

export const APPAREL_CATEGORIES: { value: ApparelCategory; label: string }[] = [
  { value: 'top', label: 'Tops' },
  { value: 'bottom', label: 'Bottoms' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'footwear', label: 'Shoes' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'eyewear', label: 'Glasses' },
  { value: 'accessory', label: 'Accessories' },
  { value: 'bag', label: 'Bags' },
]

export const CATEGORY_VALUES = APPAREL_CATEGORIES.map(c => c.value) as [ApparelCategory, ...ApparelCategory[]]

export const OCCASIONS = ['class', 'casual', 'gym', 'going_out', 'formal', 'lounge', 'date', 'work'] as const
export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const

export const WEEKLY_SLOTS: { slot: Exclude<OutfitSlot, 'custom'>; label: string; brief: string }[] = [
  { slot: 'class', label: 'Class', brief: 'Everyday campus look for class: put-together, comfortable for walking all day.' },
  { slot: 'casual', label: 'Casual', brief: 'Elevated casual: relaxed but clearly styled, the fit that gets compliments.' },
  { slot: 'gym', label: 'Gym', brief: 'Gym / training fit: athletic pieces and trainers, functional first, still clean.' },
  { slot: 'going_out', label: 'Going Out', brief: 'Night out / party / event: the sharpest look in the closet for the weather.' },
]

export const SLOT_LABELS: Record<OutfitSlot, string> = {
  class: 'Class',
  casual: 'Casual',
  gym: 'Gym',
  going_out: 'Going Out',
  custom: 'Custom',
}

export const PALETTES: { name: string; swatches: string[] }[] = [
  { name: 'Earth tones', swatches: ['#6B4F3A', '#A67B5B', '#D9C3A5', '#4A5240'] },
  { name: 'Monochrome', swatches: ['#111111', '#4A4A4A', '#9A9A9A', '#F2F2F2'] },
  { name: 'Old money', swatches: ['#1F2A44', '#F3EBDD', '#8C6A4F', '#2E4A3A'] },
  { name: 'All black', swatches: ['#0A0A0A', '#1C1C1C', '#2B2B2B', '#C9A84C'] },
  { name: 'Navy & cream', swatches: ['#1B2A4A', '#F4EDE1', '#B9A68A', '#5A6B85'] },
  { name: 'Olive & tan', swatches: ['#556B2F', '#C8AD7F', '#3B3A30', '#EFE6D2'] },
  { name: 'Streetwear pop', swatches: ['#111111', '#F5F5F5', '#D7263D', '#1E88E5'] },
  { name: 'Pastels', swatches: ['#F6D6D6', '#D6E6F2', '#E3F2D6', '#F2EBD6'] },
]

export const OCCASION_PRESETS = [
  'Class',
  'Casual hang',
  'Gym',
  'Party',
  'Date night',
  'Club / lounge',
  'Interview',
  'Church',
  'Dinner out',
  'Travel day',
]

export const WARDROBE_IMAGES_BUCKET = 'wardrobe-images'

export const CLAUDE_MODEL = 'claude-opus-5-5'
