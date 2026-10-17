import { NextResponse } from 'next/server'
import { renderOutfit, type ImageInput } from '@/lib/stylemate/images'
import { downloadImage, errorMessage, extFor, requireOwner, uploadImage } from '@/lib/stylemate/server'
import type { Outfit, WardrobeItem } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAX_REFERENCE_IMAGES = 8

// Generates the screenshot-ready flat lay for one outfit.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireOwner()
  if (!auth.ok) return auth.response
  const { supabase, user } = auth

  const { data: outfitRow, error } = await supabase.from('stylemate_outfits').select('*').eq('id', params.id).single()
  if (error || !outfitRow) return NextResponse.json({ error: 'Outfit not found' }, { status: 404 })
  const outfit = outfitRow as Outfit

  const { data: itemRows } = await supabase.from('wardrobe_items').select('*').in('id', outfit.item_ids)
  const items = (itemRows as WardrobeItem[]) ?? []
  if (items.length === 0) return NextResponse.json({ error: 'This outfit has no items left' }, { status: 409 })

  await supabase.from('stylemate_outfits').update({ image_status: 'pending' }).eq('id', outfit.id)

  try {
    const pieces = await Promise.all(
      items.map(async (item, i) => {
        const path = item.render_path ?? item.image_url
        let image: ImageInput | null = null
        if (path && i < MAX_REFERENCE_IMAGES) image = await downloadImage(supabase, path).catch(() => null)
        return { item, image }
      }),
    )
    const generated = await renderOutfit(pieces, { title: outfit.title, occasion: outfit.occasion })
    const path = await uploadImage(
      supabase,
      `${user.id}/outfits/${outfit.id}.${extFor(generated.mimeType)}`,
      generated.bytes,
      generated.mimeType,
    )
    const { data: updated, error: updateError } = await supabase
      .from('stylemate_outfits')
      .update({ image_path: path, image_status: 'done' })
      .eq('id', outfit.id)
      .select('*')
      .single()
    if (updateError) throw updateError
    return NextResponse.json({ outfit: updated })
  } catch (err) {
    await supabase.from('stylemate_outfits').update({ image_status: 'failed' }).eq('id', outfit.id)
    return NextResponse.json({ error: errorMessage(err, 'Image generation failed') }, { status: 502 })
  }
}
