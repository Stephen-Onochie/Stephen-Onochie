import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchTitles, TmdbNotConfiguredError } from '@/lib/watchlist/tmdb'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  try {
    return NextResponse.json({ results: await searchTitles(q) })
  } catch (err) {
    if (err instanceof TmdbNotConfiguredError) {
      return NextResponse.json({ error: 'TMDB is not configured on the server.' }, { status: 503 })
    }
    console.error('watchlist search failed:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 502 })
  }
}
