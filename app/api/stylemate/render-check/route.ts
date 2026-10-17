import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callGenerateContent, callInteractions, callOpenRouter } from '@/lib/stylemate/images'
import { downloadImage, errorMessage } from '@/lib/stylemate/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Temporary diagnostic for failing renders; removed once fixed.
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const apiKey = process.env.GEMINI_API_KEY
  const itemId = new URL(request.url).searchParams.get('item')
  const supabase = createAdminClient()
  const { data: item } = await supabase.from('wardrobe_items').select('image_url, name').eq('id', itemId).single()
  const photo = item?.image_url ? await downloadImage(supabase, item.image_url) : null


  const parts = [
    { type: 'text' as const, text: `Product photo of only this item: ${item?.name}, on a plain off-white background.` },
    ...(photo ? [{ type: 'image' as const, mime_type: photo.mimeType, data: photo.data }] : []),
  ]
  const probe = async (fn: () => Promise<{ bytes: Buffer; mimeType: string }>) => {
    const t = Date.now()
    try {
      const img = await fn()
      return { ok: true, ms: Date.now() - t, bytes: img.bytes.length, mime: img.mimeType }
    } catch (e) {
      return { ok: false, ms: Date.now() - t, error: errorMessage(e) }
    }
  }
  const orKey = process.env.OPENROUTER_API_KEY
  const images = photo ? [photo] : []
  return NextResponse.json({
    photo: photo ? { mime: photo.mimeType, b64len: photo.data.length } : null,
    interactions: apiKey ? await probe(() => callInteractions(apiKey, parts, '1:1')) : 'no key',
    generateContent: apiKey ? await probe(() => callGenerateContent(apiKey, parts, '1:1')) : 'no key',
    openRouter: orKey ? await probe(() => callOpenRouter(orKey, `Product photo of only this item: ${item?.name}, on a plain off-white background.`, images, '1:1')) : 'no key',
  })
}
