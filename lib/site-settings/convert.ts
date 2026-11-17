// .docx → .pdf via ConvertAPI (Word-engine rendering, so fonts, columns and
// margins survive). Vercel functions can't run LibreOffice, and an in-browser
// conversion either loses the layout or produces an image-only PDF that
// recruiters' ATS can't read.
const CONVERT_URL = 'https://v2.convertapi.com/convert/docx/to/pdf'

export function docxConversionConfigured(): boolean {
  return !!process.env.CONVERTAPI_SECRET
}

export async function convertDocxToPdf(docx: ArrayBuffer, fileName: string): Promise<Buffer> {
  const secret = process.env.CONVERTAPI_SECRET
  if (!secret) {
    throw new Error('Word conversion is not set up (CONVERTAPI_SECRET). Upload a PDF, or add the key in Vercel.')
  }

  const form = new FormData()
  form.append('File', new Blob([docx]), fileName)
  form.append('StoreFile', 'false')

  const res = await fetch(CONVERT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    body: form,
    cache: 'no-store',
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Word to PDF conversion failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }
  const json = (await res.json()) as { Files?: { FileData?: string }[] }
  const data = json.Files?.[0]?.FileData
  if (!data) throw new Error('Word to PDF conversion returned no file')
  return Buffer.from(data, 'base64')
}
