import { NextResponse } from 'next/server'
import { renderItem } from '@/lib/stylemate/images'
import { downloadImage, errorMessage, extFor, requireOwner, uploadImage } from '@/lib/stylemate/server'
import type { WardrobeItem } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Generates the clean 2D product render shown in the closet grid.
export async function POST(request: Request) {
  const auth = await requireOwner()
  if (!auth.ok) return auth.response
  const { supabase, user } = auth

  const { itemId } = (await request.json().catch(() => ({}))) as { itemId?: string }
  if (!itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 })

  const { data: item, error } = await supabase.from('wardrobe_items').select('*').eq('id', itemId).single()
  if (error || !item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  const wardrobeItem = item as WardrobeItem

  await supabase.from('wardrobe_items').update({ render_status: 'pending' }).eq('id', itemId)

  try {
    const photo = wardrobeItem.image_url ? await downloadImage(supabase, wardrobeItem.image_url) : null
    const image = await renderItem(wardrobeItem, photo)
    const path = await uploadImage(supabase, `${user.id}/renders/${itemId}.${extFor(image.mimeType)}`, image.bytes, image.mimeType)
    const { data: updated, error: updateError } = await supabase
      .from('wardrobe_items')
      .update({ render_path: path, render_status: 'done', updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*')
      .single()
    if (updateError) throw updateError
    return NextResponse.json({ item: updated })
  } catch (err) {
    await supabase.from('wardrobe_items').update({ render_status: 'failed' }).eq('id', itemId)
    return NextResponse.json({ error: errorMessage(err, 'Render failed') }, { status: 502 })
  }
}
