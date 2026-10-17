const MAX_EDGE = 1568

// Phone photos are 3-12 MB; Claude downscales anything past ~1568px anyway, so
// shrink before upload to keep scans fast. Falls back to the original file if
// the browser can't decode it (e.g. HEIC on desktop Chrome).
export async function resizeForUpload(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86))
    return blob ?? file
  } catch {
    return file
  }
}
