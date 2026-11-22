import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PDF_MIME, RESUME_DOWNLOAD_NAME, SITE_FILES_BUCKET } from '@/lib/site-settings/resume'
import { FALLBACK_RESUME_URL } from '@/types/public-view'

export const dynamic = 'force-dynamic'
// force-dynamic alone doesn't stop Next's Data Cache from replaying supabase-js
// fetches, which kept serving the old PDF after a new upload.
export const fetchCache = 'force-no-store'

// stephenonochie.com/resume: the uploaded résumé PDF, opened inline in the
// browser's viewer. Before any upload exists it falls back to the external
// résumé link so the URL never dead-ends.
export async function GET() {
  const ownerId = process.env.HEALTH_USER_ID
  if (!ownerId) return NextResponse.redirect(FALLBACK_RESUME_URL, 307)

  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('public_view_settings')
    .select('resume_url, resume_file_path')
    .eq('user_id', ownerId)
    .maybeSingle()

  if (settings?.resume_file_path) {
    const { data: file } = await admin.storage.from(SITE_FILES_BUCKET).download(settings.resume_file_path)
    if (file) {
      return new NextResponse(file.stream(), {
        headers: {
          'Content-Type': PDF_MIME,
          'Content-Length': String(file.size),
          'Content-Disposition': `inline; filename="${RESUME_DOWNLOAD_NAME}"`,
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex',
        },
      })
    }
  }

  const fallback = settings?.resume_url
  if (fallback && /^https?:\/\//.test(fallback)) return NextResponse.redirect(fallback, 307)
  return new NextResponse('Résumé coming soon.', { status: 404 })
}
