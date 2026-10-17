import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { WARDROBE_IMAGES_BUCKET } from '@/lib/stylemate/constants'
import { renderOutfit } from '@/lib/stylemate/images'
import { downloadImage, errorMessage, extFor, uploadImage } from '@/lib/stylemate/server'
import type { WardrobeItem } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Temporary: verifies 7-piece outfit images after the 3-reference limit fix; removed once confirmed.
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const names = ['Tan Twill Suede Collar Worker Jacket', 'White Tokyo Drifting Patch Tee', "Black Levi's 550 Relaxed Jeans", 'Black White Air Jordan 1 Low']
  const { data } = await supabase.from('wardrobe_items').select('*').in('name', names)
  const items = (data as WardrobeItem[]) ?? []
  const { data: extra } = await supabase.from('wardrobe_items').select('*').in('category', ['jewelry', 'eyewear', 'accessory']).limit(3)
  const pieces = await Promise.all([...items, ...((extra as WardrobeItem[]) ?? [])].map(async item => ({
    item,
    image: await downloadImage(supabase, item.render_path ?? item.image_url!).catch(() => null),
  })))
  const t = Date.now()
  try {
    const image = await renderOutfit(pieces, { title: 'Workwear Monochrome Test', occasion: 'class' })
    const path = await uploadImage(supabase, `${items[0].user_id}/outfits/look-check.${extFor(image.mimeType)}`, image.bytes, image.mimeType)
    const { data: signed } = await supabase.storage.from(WARDROBE_IMAGES_BUCKET).createSignedUrl(path, 3600)
    return NextResponse.json({ ok: true, ms: Date.now() - t, pieces: pieces.map(p => `${p.item.name}${p.image ? '' : ' (no image)'}`), url: signed?.signedUrl, path })
  } catch (e) {
    return NextResponse.json({ ok: false, ms: Date.now() - t, pieces: pieces.map(p => p.item.name), error: errorMessage(e) })
  }
}
