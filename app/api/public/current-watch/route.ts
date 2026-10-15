import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { PublicCurrentWatch, WatchItem } from '@/types/watchlist'
import { progressSummary } from '@/lib/watchlist/progress'

// Always read live: the owner can change the featured title at any time.
export const dynamic = 'force-dynamic'

// Public, unauthenticated read of the single title the owner has featured as
// Currently Watching. Mirrors /api/public/current-book: service-role client,
// hard-scoped to the site owner, and only a public-safe subset is returned
// (no notes or rating).
export async function GET() {
  const ownerId = process.env.HEALTH_USER_ID
  if (!ownerId) return NextResponse.json({ watch: null })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    }
  )

  const { data, error } = await supabase
    .from('watch_items')
    .select('*')
    .eq('user_id', ownerId)
    .eq('is_public_current', true)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ watch: null })

  const item = data as WatchItem
  const progress = progressSummary(item)
  const watch: PublicCurrentWatch = {
    title: item.title,
    kind: item.kind,
    year: item.year,
    posterUrl: item.poster_url,
    genres: item.details?.genres.slice(0, 3) ?? [],
    progressLabel: progress
      ? progress.total ? `${progress.label} · ${progress.watched} of ${progress.total} episodes` : progress.label
      : null,
    progressPct: progress?.pct ?? null,
  }
  return NextResponse.json({ watch })
}
