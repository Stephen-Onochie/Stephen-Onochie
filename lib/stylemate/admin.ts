import type { SupabaseClient } from '@supabase/supabase-js'
import { ownerUserId } from '@/lib/stylemate/server'
import { withItemUrls } from '@/lib/stylemate/supabase'
import { isSweater, isTee } from '@/lib/stylemate/rules'
import { addDaysToDateStr, todayEastern } from '@/lib/dates'
import type { ApparelCategory, Outfit, WardrobeItem } from '@/types/stylemate'

// Read-only, service-role StyleMate access for the MCP connector (no browser
// session), so every query is explicitly filtered by the owner's uid.

function userId(): string {
  const id = ownerUserId()
  if (!id) throw new Error('STYLEMATE_USER_ID (or HEALTH_USER_ID) is not configured')
  return id
}

export interface WardrobeFilter {
  category?: ApparelCategory
  search?: string
  include_incoming?: boolean
  include_images?: boolean
}

export async function adminListWardrobe(db: SupabaseClient, filter: WardrobeFilter = {}) {
  let q = db.from('wardrobe_items').select('*').eq('user_id', userId()).order('category').order('name')
  if (filter.category) q = q.eq('category', filter.category)
  if (!filter.include_incoming) q = q.eq('is_incoming', false)
  const { data, error } = await q
  if (error) throw error
  let items = (data as WardrobeItem[]) ?? []
  if (filter.search) {
    const needle = filter.search.toLowerCase()
    items = items.filter(i =>
      [i.name, i.sub_type, i.color, i.brand, i.material, i.pattern, i.description, ...i.colors, ...i.style_tags]
        .some(v => v?.toLowerCase().includes(needle))
    )
  }
  const images = filter.include_images
    ? new Map((await withItemUrls(db, items)).map(v => [v.id, v.render_url ?? v.photo_url]))
    : null
  return items.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category,
    sub_type: i.sub_type,
    color: i.color,
    colors: i.colors,
    pattern: i.pattern,
    material: i.material,
    fit: i.fit,
    brand: i.brand,
    size: i.size,
    description: i.description,
    formality: i.formality,
    warmth: i.warmth,
    seasons: i.seasons,
    occasions: i.occasions,
    style_tags: i.style_tags,
    temp_range_f: [i.min_temp_threshold, i.max_temp_threshold],
    is_tee: isTee(i),
    is_sweater: isSweater(i),
    is_incoming: i.is_incoming,
    wear_count: i.wear_count,
    last_worn_on: i.last_worn_on,
    ...(images ? { image_url: images.get(i.id) ?? null } : {}),
  }))
}

export interface OutfitFilter {
  from?: string
  to?: string
  library?: boolean
}

export async function adminListOutfits(db: SupabaseClient, filter: OutfitFilter = {}) {
  let q = db.from('stylemate_outfits').select('*').eq('user_id', userId())
  if (filter.library) {
    q = q.eq('saved', true).order('created_at', { ascending: false }).limit(300)
  } else {
    const from = filter.from ?? todayEastern()
    q = q.gte('plan_date', from).lte('plan_date', filter.to ?? addDaysToDateStr(from, 7)).order('plan_date')
  }
  const { data, error } = await q
  if (error) throw error
  const outfits = (data as Outfit[]) ?? []

  const ids = Array.from(new Set(outfits.flatMap(o => o.item_ids)))
  const names = new Map<string, { name: string; category: string }>()
  if (ids.length) {
    const { data: items, error: itemsError } = await db
      .from('wardrobe_items')
      .select('id, name, category')
      .eq('user_id', userId())
      .in('id', ids)
    if (itemsError) throw itemsError
    for (const i of items ?? []) names.set(i.id, { name: i.name, category: i.category })
  }

  return outfits.map(o => ({
    id: o.id,
    plan_date: o.plan_date,
    slot: o.slot,
    title: o.title,
    occasion: o.occasion,
    palette: o.palette,
    pieces: o.item_ids.flatMap(id => {
      const item = names.get(id)
      return item ? [{ id, ...item }] : []
    }),
    reasoning: o.reasoning,
    styling_tip: o.styling_tip,
    weather: o.weather,
    saved: o.saved,
    worn_on: o.worn_on,
  }))
}
