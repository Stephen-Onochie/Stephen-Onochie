import { NextResponse } from 'next/server'
import { todayEastern } from '@/lib/dates'
import { generateAndStoreOutfits } from '@/lib/stylemate/outfits'
import { errorMessage, requireOwner } from '@/lib/stylemate/server'
import { fetchForecast } from '@/lib/stylemate/weather'
import type { OutfitRequest, OutfitSlot } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SLOTS = new Set<OutfitSlot>(['class', 'casual', 'gym', 'going_out', 'custom'])

export async function POST(request: Request) {
  const auth = await requireOwner()
  if (!auth.ok) return auth.response
  const { supabase, user } = auth

  let body: OutfitRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date ?? '') ? body.date : todayEastern()
  const occasion = body.occasion?.trim().slice(0, 300) || 'Everyday look'
  const slot = body.slot && SLOTS.has(body.slot) ? body.slot : 'custom'
  const count = Math.min(5, Math.max(1, Math.round(body.count ?? 3)))

  try {
    const weather = body.weather ?? (await fetchForecast(date, 1))[0]
    const outfits = await generateAndStoreOutfits(
      supabase,
      user.id,
      [{
        key: 'request',
        date,
        slot,
        occasion,
        palette: body.palette?.trim().slice(0, 200) || null,
        notes: body.notes?.trim().slice(0, 500) || null,
        weather,
        count,
      }],
      'daily',
    )
    return NextResponse.json({ outfits })
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Outfit generation failed') }, { status: 502 })
  }
}
