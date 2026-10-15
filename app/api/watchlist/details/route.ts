import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchDetails, TmdbNotConfiguredError } from '@/lib/watchlist/tmdb'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const type = params.get('type')
  const id = parseInt(params.get('id') ?? '', 10)
  if ((type !== 'movie' && type !== 'tv') || !Number.isFinite(id)) {
    return NextResponse.json({ error: 'Expected ?type=movie|tv&id=<tmdb id>' }, { status: 400 })
  }

  try {
    return NextResponse.json({ details: await fetchDetails(type, id) })
  } catch (err) {
    if (err instanceof TmdbNotConfiguredError) {
      return NextResponse.json({ error: 'TMDB is not configured on the server.' }, { status: 503 })
    }
    console.error('watchlist details failed:', err)
    return NextResponse.json({ error: 'Could not load details' }, { status: 502 })
  }
}
