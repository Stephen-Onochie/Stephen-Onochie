import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callGenerateContent, callInteractions } from '@/lib/stylemate/images'
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

  const models = apiKey
    ? await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': apiKey } })
        .then(async r => (r.ok ? ((await r.json()).models ?? []).map((m: { name: string }) => m.name).filter((n: string) => /image|banana/i.test(n)) : `${r.status} ${(await r.text()).slice(0, 300)}`))
        .catch(e => errorMessage(e))
    : null

  const parts = [
    { type: 'text' as const, text: `Product photo of only this item: ${item?.name}, on a plain off-white background.` },
    ...(photo ? [{ type: 'image' as const, mime_type: photo.mimeType, data: photo.data }] : []),
  ]
  const probe = async (fn: typeof callInteractions) => {
    const t = Date.now()
    try {
      const img = await fn(apiKey!, parts, '1:1')
      return { ok: true, ms: Date.now() - t, bytes: img.bytes.length, mime: img.mimeType }
    } catch (e) {
      return { ok: false, ms: Date.now() - t, error: errorMessage(e) }
    }
  }
  return NextResponse.json({
    hasKey: !!apiKey,
    keyPrefix: apiKey?.slice(0, 4),
    photo: photo ? { mime: photo.mimeType, b64len: photo.data.length } : null,
    models,
    interactions: apiKey ? await probe(callInteractions) : null,
    generateContent: apiKey ? await probe(callGenerateContent) : null,
  })
}
