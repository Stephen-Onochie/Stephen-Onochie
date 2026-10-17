import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { WARDROBE_IMAGES_BUCKET } from '@/lib/stylemate/constants'
import { renderItem } from '@/lib/stylemate/images'
import { downloadImage, errorMessage, extFor, uploadImage } from '@/lib/stylemate/server'
import type { WardrobeItem } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Temporary: re-runs failed item renders after the Gemini key suspension; removed once done.
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data } = await supabase.from('wardrobe_items').select('*').eq('render_status', 'failed')
  const items = (data as WardrobeItem[]) ?? []

  const results = await Promise.all(items.map(async item => {
    const t = Date.now()
    try {
      const photo = item.image_url ? await downloadImage(supabase, item.image_url) : null
      const image = await renderItem(item, photo)
      const path = await uploadImage(supabase, `${item.user_id}/renders/${item.id}.${extFor(image.mimeType)}`, image.bytes, image.mimeType)
      await supabase.from('wardrobe_items').update({ render_path: path, render_status: 'done' }).eq('id', item.id)
      const { data: signed } = await supabase.storage.from(WARDROBE_IMAGES_BUCKET).createSignedUrl(path, 3600)
      return { name: item.name, ok: true, ms: Date.now() - t, url: signed?.signedUrl }
    } catch (e) {
      return { name: item.name, ok: false, ms: Date.now() - t, error: errorMessage(e) }
    }
  }))
  return NextResponse.json({ results })
}
