import type { SupabaseClient } from '@supabase/supabase-js'
import { WARDROBE_IMAGES_BUCKET } from '@/lib/stylemate/constants'
import { sundayOf } from '@/lib/stylemate/plan'
import type {
  Outfit,
  OutfitView,
  StylistMessage,
  StylistThread,
  WardrobeItem,
  WardrobeItemView,
} from '@/types/stylemate'

const SIGNED_URL_TTL = 60 * 60 * 6

async function signPaths(supabase: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)))
  if (unique.length === 0) return new Map()
  const { data } = await supabase.storage.from(WARDROBE_IMAGES_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL)
  const urls = new Map<string, string>()
  for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl)
  return urls
}

export async function withItemUrls(supabase: SupabaseClient, items: WardrobeItem[]): Promise<WardrobeItemView[]> {
  const urls = await signPaths(supabase, items.flatMap(i => [i.image_url, i.render_path].filter((p): p is string => !!p)))
  return items.map(i => ({
    ...i,
    photo_url: i.image_url ? urls.get(i.image_url) ?? null : null,
    render_url: i.render_path ? urls.get(i.render_path) ?? null : null,
  }))
}

export async function withOutfitUrls(supabase: SupabaseClient, outfits: Outfit[]): Promise<OutfitView[]> {
  const urls = await signPaths(supabase, outfits.flatMap(o => [o.image_path, o.model_image_path]).filter((p): p is string => !!p))
  return outfits.map(o => ({
    ...o,
    image_url: o.image_path ? urls.get(o.image_path) ?? null : null,
    model_image_url: o.model_image_path ? urls.get(o.model_image_path) ?? null : null,
  }))
}

export async function fetchItems(supabase: SupabaseClient): Promise<WardrobeItemView[]> {
  const { data, error } = await supabase.from('wardrobe_items').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return withItemUrls(supabase, (data as WardrobeItem[]) ?? [])
}

export async function updateItem(supabase: SupabaseClient, id: string, patch: Partial<WardrobeItem>): Promise<WardrobeItemView> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  const [view] = await withItemUrls(supabase, [data as WardrobeItem])
  return view
}

export async function deleteItem(supabase: SupabaseClient, item: WardrobeItem, allItems: WardrobeItem[]): Promise<void> {
  // One scan photo can back several items; only delete it when this is the last user.
  const photoShared = !!item.image_url && allItems.some(i => i.id !== item.id && i.image_url === item.image_url)
  const paths = [photoShared ? null : item.image_url, item.render_path].filter((p): p is string => !!p)
  if (paths.length) await supabase.storage.from(WARDROBE_IMAGES_BUCKET).remove(paths)
  const { error } = await supabase.from('wardrobe_items').delete().eq('id', item.id)
  if (error) throw error
}

export async function uploadScanPhoto(supabase: SupabaseClient, userId: string, blob: Blob): Promise<string> {
  const path = `${userId}/scans/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(WARDROBE_IMAGES_BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/jpeg' })
  if (error) throw error
  return path
}

export async function fetchOutfits(supabase: SupabaseClient, from: string, to: string): Promise<OutfitView[]> {
  const { data, error } = await supabase
    .from('stylemate_outfits')
    .select('*')
    .gte('plan_date', from)
    .lte('plan_date', to)
    .order('created_at', { ascending: true })
  if (error) throw error
  return withOutfitUrls(supabase, (data as Outfit[]) ?? [])
}

export async function fetchSavedOutfits(supabase: SupabaseClient): Promise<OutfitView[]> {
  const { data, error } = await supabase
    .from('stylemate_outfits')
    .select('*')
    .eq('saved', true)
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw error
  return withOutfitUrls(supabase, (data as Outfit[]) ?? [])
}

export async function updateOutfit(supabase: SupabaseClient, id: string, patch: Partial<Outfit>): Promise<OutfitView> {
  const { data, error } = await supabase.from('stylemate_outfits').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  const [view] = await withOutfitUrls(supabase, [data as Outfit])
  return view
}

/**
 * Puts an outfit on a day, or into the library only (date null). Moving it saves
 * it, so the Sunday plan never replaces an outfit the owner placed by hand.
 */
export async function moveOutfit(supabase: SupabaseClient, outfit: Outfit, date: string | null): Promise<OutfitView> {
  return updateOutfit(supabase, outfit.id, {
    plan_date: date,
    week_start: date ? sundayOf(date) : null,
    weather: date === outfit.plan_date ? outfit.weather : null,
    saved: true,
  })
}

export async function deleteOutfit(supabase: SupabaseClient, outfit: Outfit): Promise<void> {
  const paths = [outfit.image_path, outfit.model_image_path].filter((p): p is string => !!p)
  if (paths.length) await supabase.storage.from(WARDROBE_IMAGES_BUCKET).remove(paths)
  const { error } = await supabase.from('stylemate_outfits').delete().eq('id', outfit.id)
  if (error) throw error
}

/** Marks an outfit worn on `date`: saves it and bumps each piece's wear stats. */
export async function wearOutfit(
  supabase: SupabaseClient,
  outfit: Outfit,
  items: WardrobeItem[],
  date: string,
): Promise<{ outfit: OutfitView; items: WardrobeItemView[] }> {
  const updatedOutfit = await updateOutfit(supabase, outfit.id, { worn_on: date, saved: true })
  const pieces = items.filter(i => outfit.item_ids.includes(i.id))
  const updatedItems = await Promise.all(
    pieces.map(i => updateItem(supabase, i.id, { wear_count: i.wear_count + 1, last_worn_on: date })),
  )
  return { outfit: updatedOutfit, items: updatedItems }
}

export async function fetchThreads(supabase: SupabaseClient): Promise<StylistThread[]> {
  const { data, error } = await supabase
    .from('stylemate_threads')
    .select('id, title, messages, updated_at')
    .order('updated_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data as StylistThread[]) ?? []
}

export async function saveThread(
  supabase: SupabaseClient,
  userId: string,
  thread: { id: string | null; title: string; messages: StylistMessage[] },
): Promise<StylistThread> {
  const row = { title: thread.title, messages: thread.messages, updated_at: new Date().toISOString() }
  const query = thread.id
    ? supabase.from('stylemate_threads').update(row).eq('id', thread.id)
    : supabase.from('stylemate_threads').insert({ ...row, user_id: userId })
  const { data, error } = await query.select('id, title, messages, updated_at').single()
  if (error) throw error
  return data as StylistThread
}

export async function deleteThread(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('stylemate_threads').delete().eq('id', id)
  if (error) throw error
}
