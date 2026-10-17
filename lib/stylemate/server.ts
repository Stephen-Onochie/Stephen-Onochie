import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { WARDROBE_IMAGES_BUCKET } from '@/lib/stylemate/constants'
import type { ImageMediaType } from '@/lib/stylemate/claude'
import type { ImageInput } from '@/lib/stylemate/images'

type OwnerResult =
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; response: NextResponse }

export async function requireOwner(): Promise<OwnerResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user.email !== allowedEmail) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
  }
  return { ok: true, supabase, user }
}

/** Single-owner app: machine routes (Gmail ingest, weekly cron) write as this user. */
export function ownerUserId(): string | null {
  return process.env.STYLEMATE_USER_ID ?? process.env.HEALTH_USER_ID ?? null
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') return err.message
  return fallback
}

const CLAUDE_MEDIA_TYPES = new Set<ImageMediaType>(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function claudeMediaType(mime: string | null | undefined): ImageMediaType | null {
  const m = (mime ?? '').toLowerCase().split(';')[0].trim() as ImageMediaType
  return CLAUDE_MEDIA_TYPES.has(m) ? m : null
}

export async function downloadImage(supabase: SupabaseClient, path: string): Promise<ImageInput> {
  const { data, error } = await supabase.storage.from(WARDROBE_IMAGES_BUCKET).download(path)
  if (error || !data) throw new Error(`Could not read image ${path}`)
  const bytes = Buffer.from(await data.arrayBuffer())
  const ext = path.split('.').pop()?.toLowerCase()
  const mimeType = data.type && data.type !== 'application/octet-stream'
    ? data.type
    : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  return { data: bytes.toString('base64'), mimeType }
}

export async function uploadImage(
  supabase: SupabaseClient,
  path: string,
  bytes: Buffer,
  mimeType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(WARDROBE_IMAGES_BUCKET)
    .upload(path, bytes, { upsert: true, contentType: mimeType })
  if (error) throw error
  return path
}

export function extFor(mimeType: string): string {
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('webp')) return 'webp'
  return 'jpg'
}
