import type { SupabaseClient } from '@supabase/supabase-js'
import { WARDROBE_IMAGES_BUCKET } from '@/lib/stylemate/constants'
import type {
  WardrobeItem,
  WardrobeItemInsert,
  WardrobeItemWithSignedUrl,
} from '@/types/stylemate'

const SIGNED_URL_TTL = 3600

export function wardrobeImagePath(userId: string, itemId: string, ext = 'jpg'): string {
  return `${userId}/${itemId}.${ext}`
}

export async function fetchWardrobeItems(
  supabase: SupabaseClient,
  options?: { incomingOnly?: boolean }
): Promise<WardrobeItemWithSignedUrl[]> {
  let query = supabase
    .from('wardrobe_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.incomingOnly) {
    query = query.eq('is_incoming', true)
  } else {
    query = query.eq('is_incoming', false)
  }

  const { data, error } = await query
  if (error) throw error

  const items = (data as WardrobeItem[]) ?? []
  return Promise.all(items.map((item) => attachSignedUrl(supabase, item)))
}

async function attachSignedUrl(
  supabase: SupabaseClient,
  item: WardrobeItem
): Promise<WardrobeItemWithSignedUrl> {
  if (!item.image_url) {
    return { ...item, signed_image_url: null }
  }

  const { data, error } = await supabase.storage
    .from(WARDROBE_IMAGES_BUCKET)
    .createSignedUrl(item.image_url, SIGNED_URL_TTL)

  if (error) {
    return { ...item, signed_image_url: null }
  }

  return { ...item, signed_image_url: data.signedUrl }
}

export async function createWardrobeItem(
  supabase: SupabaseClient,
  userId: string,
  item: WardrobeItemInsert
): Promise<WardrobeItem> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .insert({ ...item, user_id: userId })
    .select('*')
    .single()

  if (error) throw error
  return data as WardrobeItem
}

export async function updateWardrobeItem(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<WardrobeItemInsert>
): Promise<WardrobeItem> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as WardrobeItem
}

export async function deleteWardrobeItem(
  supabase: SupabaseClient,
  id: string,
  imagePath?: string | null
): Promise<void> {
  if (imagePath) {
    await supabase.storage.from(WARDROBE_IMAGES_BUCKET).remove([imagePath])
  }

  const { error } = await supabase.from('wardrobe_items').delete().eq('id', id)
  if (error) throw error
}

export async function uploadWardrobeImage(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = wardrobeImagePath(userId, itemId, ext)

  const { error } = await supabase.storage
    .from(WARDROBE_IMAGES_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })

  if (error) throw error
  return path
}

export async function approveIncomingItem(
  supabase: SupabaseClient,
  id: string
): Promise<WardrobeItem> {
  return updateWardrobeItem(supabase, id, { is_incoming: false })
}
