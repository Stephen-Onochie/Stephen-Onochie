import { NextResponse } from 'next/server'
import { requireOwner, errorMessage } from '@/lib/stylemate/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  PDF_MIME,
  RESUME_MAX_BYTES,
  SITE_FILES_BUCKET,
  resumeKind,
  resumePath,
  type ResumeFileInfo,
} from '@/lib/site-settings/resume'
import { convertDocxToPdf, docxConversionConfigured } from '@/lib/site-settings/convert'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const owner = await requireOwner()
  if (!owner.ok) return owner.response
  return NextResponse.json({ docxSupported: docxConversionConfigured() })
}

// The browser uploads the raw drop to site-files/<uid>/uploads/ (keeps big files
// clear of the 4.5MB function body limit); this turns it into the live PDF.
export async function POST(request: Request) {
  const owner = await requireOwner()
  if (!owner.ok) return owner.response
  const userId = owner.user.id

  const body = (await request.json().catch(() => null)) as { path?: string; fileName?: string } | null
  const uploadPath = body?.path ?? ''
  const fileName = (body?.fileName ?? '').trim()
  if (!uploadPath.startsWith(`${userId}/uploads/`) || uploadPath.includes('..')) {
    return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 })
  }
  const kind = resumeKind(fileName)
  if (!kind) return NextResponse.json({ error: 'Use a .pdf or .docx file' }, { status: 400 })

  const admin = createAdminClient()
  const bucket = admin.storage.from(SITE_FILES_BUCKET)

  try {
    const { data: raw, error: dlErr } = await bucket.download(uploadPath)
    if (dlErr || !raw) throw dlErr ?? new Error('Upload not found')
    if (raw.size > RESUME_MAX_BYTES) throw new Error('File is larger than 10 MB')

    const source = await raw.arrayBuffer()
    const pdf = kind === 'docx' ? await convertDocxToPdf(source, fileName) : Buffer.from(source)
    if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('That file is not a valid PDF')

    const { error: upErr } = await bucket.upload(resumePath(userId), pdf, {
      contentType: PDF_MIME,
      upsert: true,
      cacheControl: '0',
    })
    if (upErr) throw upErr

    const uploadedAt = new Date().toISOString()
    const { error: dbErr } = await admin
      .from('public_view_settings')
      .upsert(
        {
          user_id: userId,
          resume_file_path: resumePath(userId),
          resume_file_name: fileName,
          resume_file_size: pdf.length,
          resume_uploaded_at: uploadedAt,
          updated_at: uploadedAt,
        },
        { onConflict: 'user_id' }
      )
    if (dbErr) throw dbErr

    const info: ResumeFileInfo = { fileName, size: pdf.length, uploadedAt }
    return NextResponse.json(info)
  } catch (err) {
    return NextResponse.json({ error: errorMessage(err, 'Upload failed') }, { status: 400 })
  } finally {
    await bucket.remove([uploadPath])
  }
}

export async function DELETE() {
  const owner = await requireOwner()
  if (!owner.ok) return owner.response
  const userId = owner.user.id
  const admin = createAdminClient()

  await admin.storage.from(SITE_FILES_BUCKET).remove([resumePath(userId)])
  const { error } = await admin
    .from('public_view_settings')
    .update({
      resume_file_path: null,
      resume_file_name: null,
      resume_file_size: null,
      resume_uploaded_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
