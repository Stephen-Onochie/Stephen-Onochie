import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { itemSpecSchema, itemDimsSchema } from '@/lib/dorm/spec'

export const dynamic = 'force-dynamic'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { supabase, user }
}

export async function GET() {
  const ctx = await requireUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await ctx.supabase
    .from('dorm_items')
    .select('id, name, dims, spec, image_path')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const ctx = await requireUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: { name?: string; dims?: unknown; spec?: unknown; image?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const dims = itemDimsSchema.safeParse(body.dims)
  if (!dims.success) return NextResponse.json({ error: 'Invalid dims' }, { status: 400 })
  const spec = itemSpecSchema.safeParse(body.spec)
  if (!spec.success) return NextResponse.json({ error: 'Invalid spec' }, { status: 400 })

  const { data: row, error } = await ctx.supabase
    .from('dorm_items')
    .insert({ user_id: ctx.user.id, name, dims: dims.data, spec: spec.data })
    .select('id')
    .single()
  if (error || !row) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })

  // Reference photo upload is best-effort: the item works without it.
  let imagePath: string | null = null
  const dataUrl = body.image
  if (dataUrl?.startsWith('data:image/')) {
    const comma = dataUrl.indexOf(',')
    const mime = dataUrl.slice(5, dataUrl.indexOf(';'))
    const ext = mime === 'image/png' ? 'png' : 'jpg'
    const bytes = Buffer.from(dataUrl.slice(comma + 1), 'base64')
    if (bytes.length <= 8 * 1024 * 1024) {
      const path = `${ctx.user.id}/${row.id}.${ext}`
      const { error: upErr } = await ctx.supabase.storage
        .from('dorm-items')
        .upload(path, bytes, { contentType: mime, upsert: true })
      if (!upErr) {
        imagePath = path
        await ctx.supabase.from('dorm_items').update({ image_path: path }).eq('id', row.id)
      }
    }
  }

  return NextResponse.json({ id: row.id, image_path: imagePath })
}

export async function DELETE(request: Request) {
  const ctx = await requireUser()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: row } = await ctx.supabase
    .from('dorm_items')
    .select('image_path')
    .eq('id', id)
    .maybeSingle()
  if (row?.image_path) {
    await ctx.supabase.storage.from('dorm-items').remove([row.image_path])
  }
  const { error } = await ctx.supabase.from('dorm_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await ctx.supabase.from('dorm_layout').delete().eq('item_id', `custom:${id}`)
  return NextResponse.json({ deleted: true })
}
