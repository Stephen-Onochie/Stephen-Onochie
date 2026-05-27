import { NextResponse } from 'next/server'
import { analyzeClothingImage } from '@/lib/stylemate/gemini'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user.email !== allowedEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: { imageBase64?: string; mimeType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { imageBase64, mimeType } = body
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 })
  }

  // Cap payload size to bound cost/abuse on the paid Gemini API.
  // ~10MB decoded image ≈ 13.7M base64 chars; cap at 15M to leave headroom.
  const MAX_BASE64_LENGTH = 15_000_000
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: 'Image too large' }, { status: 413 })
  }

  // Only accept image types Gemini can analyze; reject arbitrary mime strings.
  const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ])
  const safeMime =
    typeof mimeType === 'string' && ALLOWED_MIME_TYPES.has(mimeType)
      ? mimeType
      : 'image/jpeg'

  try {
    const tags = await analyzeClothingImage(imageBase64, safeMime)
    return NextResponse.json({ tags })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
