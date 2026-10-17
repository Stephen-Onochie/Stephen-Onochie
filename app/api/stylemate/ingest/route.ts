import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { tagClothing } from '@/lib/stylemate/claude'
import { tagsToColumns } from '@/lib/stylemate/items'
import { claudeMediaType, errorMessage, extFor, ownerUserId, uploadImage } from '@/lib/stylemate/server'
import type { GmailOrder, GmailOrderLine } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_LINES = 40
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const CONCURRENCY = 4

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function sourceRef(order: GmailOrder, line: GmailOrderLine): string {
  return `gmail:${order.message_id}:${slug(line.name)}:${slug(line.size ?? '')}`
}

// Product images come from retailer CDNs named in the email, so only plain
// https image responses under the size cap are accepted.
async function fetchProductImage(url: string | null | undefined): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    // Order emails embed ~128px thumbnails; retailer CDNs (boohooMAN's mediahub)
    // serve the same asset larger when the width param is raised.
    const width = Number(parsed.searchParams.get('w'))
    if (width && width < 600) {
      parsed.searchParams.set('w', '900')
      parsed.searchParams.set('h', '0')
      parsed.searchParams.delete('filter')
    }
    const res = await fetch(parsed, { signal: AbortSignal.timeout(8000), redirect: 'follow' })
    if (!res.ok) return null
    const mimeType = res.headers.get('content-type') ?? ''
    if (!claudeMediaType(mimeType)) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null
    return { bytes, mimeType: claudeMediaType(mimeType)! }
  } catch {
    return null
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        results[i] = await fn(items[i])
      }
    }),
  )
  return results
}

// Called by the daily Claude cloud routine with clothing order lines it found in
// Gmail. Lines land as is_incoming items (the "On the way" queue) for approval.
export async function POST(req: Request) {
  const secret = process.env.STYLEMATE_INGEST_SECRET
  const userId = ownerUserId()
  if (!secret || !userId) return NextResponse.json({ error: 'Ingest not configured' }, { status: 500 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { orders?: GmailOrder[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const orders = (Array.isArray(body.orders) ? body.orders : []).filter(
    o => o && typeof o.message_id === 'string' && typeof o.retailer === 'string' && Array.isArray(o.lines),
  )
  const candidates = orders
    .flatMap(order => order.lines.filter(l => l && typeof l.name === 'string' && l.name.trim()).map(line => ({ order, line, ref: sourceRef(order, line) })))
    .slice(0, MAX_LINES)

  const supabase = createAdminClient()
  const refs = candidates.map(c => c.ref)
  const { data: existing, error: existingError } = refs.length
    ? await supabase.from('wardrobe_items').select('source_ref').eq('user_id', userId).in('source_ref', refs)
    : { data: [], error: null }
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

  const seen = new Set((existing ?? []).map(r => r.source_ref as string))
  const fresh = candidates.filter(c => {
    if (seen.has(c.ref)) return false
    seen.add(c.ref)
    return true
  })

  const outcomes = await mapLimit(fresh, CONCURRENCY, async ({ order, line, ref }) => {
    try {
      const image = await fetchProductImage(line.image_url)
      const hint = [
        `Product name: ${line.name}`,
        line.brand ? `Brand: ${line.brand}` : `Retailer: ${order.retailer}`,
        line.color ? `Color: ${line.color}` : null,
        line.size ? `Size: ${line.size}` : null,
        line.category_hint ? `Type: ${line.category_hint}` : null,
      ].filter(Boolean).join('. ')

      const [tags] = await tagClothing({
        image: image ? { data: image.bytes.toString('base64'), mediaType: claudeMediaType(image.mimeType)! } : null,
        hint,
        single: true,
      })
      if (!tags) return 'not_clothing' as const

      const id = crypto.randomUUID()
      const imagePath = image
        ? await uploadImage(supabase, `${userId}/gmail/${id}.${extFor(image.mimeType)}`, image.bytes, image.mimeType)
        : null

      const { error } = await supabase.from('wardrobe_items').insert({
        ...tagsToColumns(tags),
        id,
        user_id: userId,
        brand: tags.brand ?? line.brand ?? null,
        size: line.size ?? null,
        image_url: imagePath,
        is_incoming: true,
        source: 'gmail',
        source_ref: ref,
        retailer: order.retailer,
        product_url: line.product_url ?? null,
        price: typeof line.price === 'number' ? line.price : null,
        ordered_at: order.ordered_at ?? null,
      })
      if (error) throw error
      return 'inserted' as const
    } catch (err) {
      console.error('stylemate ingest line failed', ref, errorMessage(err))
      return 'failed' as const
    }
  })

  return NextResponse.json({
    received: candidates.length,
    inserted: outcomes.filter(o => o === 'inserted').length,
    skipped_duplicates: candidates.length - fresh.length,
    skipped_not_clothing: outcomes.filter(o => o === 'not_clothing').length,
    failed: outcomes.filter(o => o === 'failed').length,
  })
}
