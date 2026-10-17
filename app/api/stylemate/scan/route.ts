import { NextResponse } from 'next/server'
import { tagClothing } from '@/lib/stylemate/claude'
import { tagsToColumns } from '@/lib/stylemate/items'
import { claudeMediaType, downloadImage, errorMessage, requireOwner } from '@/lib/stylemate/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Tags an already-uploaded closet photo and inserts one row per garment found in it.
export async function POST(request: Request) {
  const auth = await requireOwner()
  if (!auth.ok) return auth.response
  const { supabase, user } = auth

  let body: { path?: string; hint?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const path = body.path
  if (!path || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'A photo path in your folder is required' }, { status: 400 })
  }

  try {
    const photo = await downloadImage(supabase, path)
    const mediaType = claudeMediaType(photo.mimeType)
    if (!mediaType) return NextResponse.json({ error: `Unsupported image type ${photo.mimeType}` }, { status: 415 })

    const tags = await tagClothing({ image: { data: photo.data, mediaType }, hint: body.hint?.slice(0, 500) })
    if (tags.length === 0) return NextResponse.json({ items: [], note: 'No clothing found in that photo.' })

    const rows = tags.map(t => ({ ...tagsToColumns(t), user_id: user.id, image_url: path, source: 'scan' }))
    const { data, error } = await supabase.from('wardrobe_items').insert(rows).select('*')
    if (error) throw error
    return NextResponse.json({ items: data })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Scan failed') }, { status: 502 })
  }
}
