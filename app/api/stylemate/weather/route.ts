import { NextResponse } from 'next/server'
import { todayEastern } from '@/lib/dates'
import { requireOwner } from '@/lib/stylemate/server'
import { fetchForecast } from '@/lib/stylemate/weather'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireOwner()
  if (!auth.ok) return auth.response
  const url = new URL(request.url)
  const start = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('start') ?? '') ? url.searchParams.get('start')! : todayEastern()
  const days = Math.min(14, Math.max(1, Number(url.searchParams.get('days')) || 7))
  return NextResponse.json({ forecast: await fetchForecast(start, days) })
}
