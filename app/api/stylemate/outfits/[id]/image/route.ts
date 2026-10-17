import { NextResponse } from 'next/server'
import { renderOnModel, renderOutfit, type ImageInput } from '@/lib/stylemate/images'
import { downloadImage, errorMessage, extFor, requireOwner, uploadImage } from '@/lib/stylemate/server'
import type { Outfit, OutfitImageKind, WardrobeItem } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAX_REFERENCE_IMAGES = 8

const COLUMNS: Record<OutfitImageKind, { path: 'image_path' | 'model_image_path'; status: 'image_status' | 'model_image_status'; suffix: string }> = {
  flatlay: { path: 'image_path', status: 'image_status', suffix: '' },
  model: { path: 'model_image_path', status: 'model_image_status', suffix: '-model' },
}

// Generates one outfit image: the screenshot-ready flat lay, or the look on a faceless model.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireOwner()
  if (!auth.ok) return auth.response
  const { supabase, user } = auth

  const body = (await request.json().catch(() => ({}))) as { kind?: OutfitImageKind }
  const kind: OutfitImageKind = body.kind === 'model' ? 'model' : 'flatlay'
  const columns = COLUMNS[kind]

  const { data: outfitRow, error } = await supabase.from('stylemate_outfits').select('*').eq('id', params.id).single()
  if (error || !outfitRow) return NextResponse.json({ error: 'Outfit not found' }, { status: 404 })
  const outfit = outfitRow as Outfit

  const { data: itemRows } = await supabase.from('wardrobe_items').select('*').in('id', outfit.item_ids)
  const items = (itemRows as WardrobeItem[]) ?? []
  if (items.length === 0) return NextResponse.json({ error: 'This outfit has no items left' }, { status: 409 })

  await supabase.from('stylemate_outfits').update({ [columns.status]: 'pending' }).eq('id', outfit.id)

  try {
    const pieces = await Promise.all(
      items.map(async (item, i) => {
        const path = item.render_path ?? item.image_url
        let image: ImageInput | null = null
        if (path && i < MAX_REFERENCE_IMAGES) image = await downloadImage(supabase, path).catch(() => null)
        return { item, image }
      }),
    )
    const generated = kind === 'model'
      ? await renderOnModel(pieces, { title: outfit.title, occasion: outfit.occasion, stylingTip: outfit.styling_tip })
      : await renderOutfit(pieces, { title: outfit.title, occasion: outfit.occasion })
    const path = await uploadImage(
      supabase,
      `${user.id}/outfits/${outfit.id}${columns.suffix}.${extFor(generated.mimeType)}`,
      generated.bytes,
      generated.mimeType,
    )
    const { data: updated, error: updateError } = await supabase
      .from('stylemate_outfits')
      .update({ [columns.path]: path, [columns.status]: 'done' })
      .eq('id', outfit.id)
      .select('*')
      .single()
    if (updateError) throw updateError
    return NextResponse.json({ outfit: updated })
  } catch (err) {
    await supabase.from('stylemate_outfits').update({ [columns.status]: 'failed' }).eq('id', outfit.id)
    return NextResponse.json({ error: errorMessage(err, 'Image generation failed') }, { status: 502 })
  }
}
