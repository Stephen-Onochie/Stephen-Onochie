import { NextResponse } from 'next/server'
import { WARDROBE_IMAGES_BUCKET } from '@/lib/stylemate/constants'
import { describeOutfit } from '@/lib/stylemate/outfits'
import { sundayOf } from '@/lib/stylemate/plan'
import { errorMessage, requireOwner } from '@/lib/stylemate/server'
import type { Outfit, OutfitSlot, WardrobeItem } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SLOTS = new Set<OutfitSlot>(['class', 'casual', 'gym', 'going_out', 'custom'])

interface CustomOutfitBody {
  id?: string
  item_ids?: string[]
  title?: string | null
  slot?: OutfitSlot
  plan_date?: string | null
}

// Creates or edits an outfit the owner built by hand. Claude only writes the
// title (when left blank), reasoning and tip; the pieces are exactly as chosen.
export async function POST(request: Request) {
  const auth = await requireOwner()
  if (!auth.ok) return auth.response
  const { supabase, user } = auth

  let body: CustomOutfitBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ids = Array.from(new Set(body.item_ids ?? []))
  if (ids.length < 2) return NextResponse.json({ error: 'Pick at least two pieces' }, { status: 400 })
  const { data: itemRows, error: itemsError } = await supabase.from('wardrobe_items').select('*').in('id', ids)
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  const pieces = (itemRows as WardrobeItem[]) ?? []
  if (pieces.length !== ids.length) return NextResponse.json({ error: 'Some pieces are no longer in your closet' }, { status: 409 })

  const slot = body.slot && SLOTS.has(body.slot) ? body.slot : 'custom'
  const planDate = body.plan_date && /^\d{4}-\d{2}-\d{2}$/.test(body.plan_date) ? body.plan_date : null

  let existing: Outfit | null = null
  if (body.id) {
    const { data, error } = await supabase.from('stylemate_outfits').select('*').eq('id', body.id).single()
    if (error || !data) return NextResponse.json({ error: 'Outfit not found' }, { status: 404 })
    existing = data as Outfit
  }

  const piecesChanged = !existing
    || existing.item_ids.length !== ids.length
    || existing.item_ids.some(id => !ids.includes(id))

  try {
    // Re-describe only when the pieces changed; a rename or slot change keeps the notes.
    const description = piecesChanged
      ? await describeOutfit(pieces, slot)
      : { title: existing!.title, reasoning: existing!.reasoning ?? '', styling_tip: existing!.styling_tip ?? '' }
    const row = {
      item_ids: ids,
      title: body.title?.trim() || description.title,
      slot,
      plan_date: planDate,
      week_start: planDate ? sundayOf(planDate) : null,
      reasoning: description.reasoning,
      styling_tip: description.styling_tip,
      saved: true,
    }

    if (existing) {
      // Old images show the old pieces, so they go when the pieces change.
      const staleImages = piecesChanged ? [existing.image_path, existing.model_image_path].filter((p): p is string => !!p) : []
      if (staleImages.length) await supabase.storage.from(WARDROBE_IMAGES_BUCKET).remove(staleImages)
      const imageReset = piecesChanged
        ? { image_path: null, image_status: 'none', model_image_path: null, model_image_status: 'none' }
        : {}
      const { data, error } = await supabase
        .from('stylemate_outfits')
        .update({ ...row, ...imageReset, weather: existing.plan_date === planDate ? existing.weather : null })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ outfit: data })
    }

    const { data, error } = await supabase
      .from('stylemate_outfits')
      .insert({ ...row, user_id: user.id, origin: 'custom', occasion: null, palette: null })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ outfit: data })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Could not save the outfit') }, { status: 502 })
  }
}
