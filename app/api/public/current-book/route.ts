import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { PublicCurrentBook } from '@/types/reading'

// Always read live: the owner can flip which book is public at any time, and the
// row count is tiny, so per-request is correct. A statically-cached segment would
// otherwise pin an empty/stale response.
export const dynamic = 'force-dynamic'

// Public, unauthenticated read of the single book the owner has flagged as their
// current public read. The homepage has no auth session, so this bypasses RLS via
// the service-role client and is hard-scoped to the site owner (HEALTH_USER_ID).
export async function GET() {
  const ownerId = process.env.HEALTH_USER_ID
  if (!ownerId) return NextResponse.json({ book: null })

  // Service-role client with a no-store fetch so Next.js never serves a cached
  // (and potentially stale/empty) query result for this public endpoint.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    }
  )

  const { data, error } = await supabase
    .from('reading_books')
    .select('title, author, cover_url, current_page, total_pages')
    .eq('user_id', ownerId)
    .eq('is_public_current', true)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ book: null })

  const book: PublicCurrentBook = {
    title: data.title,
    author: data.author,
    coverUrl: data.cover_url,
    currentPage: data.current_page,
    totalPages: data.total_pages,
  }
  return NextResponse.json({ book })
}
