import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_VIEW_DEFAULTS, type PublicViewData } from '@/types/public-view'

// Always read live: the owner can change public settings at any time and the row
// is tiny, so per-request is correct. A statically-cached segment would pin a
// stale response.
export const dynamic = 'force-dynamic'

// Public, unauthenticated read of the owner's portfolio settings. The homepage
// has no auth session, so this bypasses RLS via the service-role client, scoped
// to the site owner (HEALTH_USER_ID — same owner id the other public routes use).
export async function GET() {
  const ownerId = process.env.HEALTH_USER_ID
  if (!ownerId) return NextResponse.json(PUBLIC_VIEW_DEFAULTS)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    }
  )

  const { data, error } = await supabase
    .from('public_view_settings')
    .select('*')
    .eq('user_id', ownerId)
    .maybeSingle()

  if (error || !data) return NextResponse.json(PUBLIC_VIEW_DEFAULTS)

  const out: PublicViewData = {
    resumeUrl: data.resume_url,
    resumeHeading: data.resume_heading,
    resumeBlurb: data.resume_blurb,
    showCurrentlyReading: data.show_currently_reading,
    githubUrl: data.github_url,
    linkedinUrl: data.linkedin_url,
    instagramUrl: data.instagram_url,
  }
  return NextResponse.json(out)
}
