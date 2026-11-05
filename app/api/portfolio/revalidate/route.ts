import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PROJECTS_TAG } from '@/lib/portfolio/projects'

// Public View calls this after any project save so the homepage cards and
// /work pages update now instead of on the hourly ISR refresh.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user.email !== allowedEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  revalidateTag(PROJECTS_TAG)
  revalidatePath('/')
  revalidatePath('/work/[slug]', 'page')
  revalidatePath('/sitemap.xml')
  return NextResponse.json({ ok: true })
}
