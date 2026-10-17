import type { WardrobeItem } from '@/types/stylemate'

// Claude has no image output, so renders come from Gemini's image model via the
// Interactions API, with the older generateContent shape as a fallback.
const IMAGE_MODEL = process.env.STYLEMATE_IMAGE_MODEL ?? 'gemini-nano-banana-2.1'
const LEGACY_IMAGE_MODEL = 'gemini-2.5-flash-image'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export interface ImageInput {
  data: string
  mimeType: string
}

export interface GeneratedImage {
  bytes: Buffer
  mimeType: string
}

type Part = { type: 'text'; text: string } | { type: 'image'; mime_type: string; data: string }

// Response shapes differ between the two endpoints, so walk the payload and keep
// the last base64 image blob found.
function findImage(node: unknown): GeneratedImage | null {
  let found: GeneratedImage | null = null
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) return value.forEach(visit)
    const obj = value as Record<string, unknown>
    const data = obj.data
    const mime = (obj.mime_type ?? obj.mimeType) as string | undefined
    if (typeof data === 'string' && data.length > 1000 && (obj.type === 'image' || mime?.startsWith('image/'))) {
      found = { bytes: Buffer.from(data, 'base64'), mimeType: mime ?? 'image/png' }
    }
    Object.values(obj).forEach(visit)
  }
  visit(node)
  return found
}

async function callInteractions(apiKey: string, parts: Part[], aspectRatio: string): Promise<GeneratedImage> {
  const res = await fetch(`${GEMINI_BASE}/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      input: parts,
      response_format: { type: 'image', mime_type: 'image/png', aspect_ratio: aspectRatio, image_size: '1K' },
    }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!res.ok) throw new Error(`Gemini interactions ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const image = findImage(await res.json())
  if (!image) throw new Error('Gemini returned no image')
  return image
}

async function callGenerateContent(apiKey: string, parts: Part[], aspectRatio: string): Promise<GeneratedImage> {
  const res = await fetch(`${GEMINI_BASE}/models/${LEGACY_IMAGE_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: parts.map(p =>
            p.type === 'text' ? { text: p.text } : { inline_data: { mime_type: p.mime_type, data: p.data } },
          ),
        },
      ],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } },
    }),
    signal: AbortSignal.timeout(90_000),
  })
  if (!res.ok) throw new Error(`Gemini generateContent ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const image = findImage(await res.json())
  if (!image) throw new Error('Gemini returned no image')
  return image
}

async function generateImage(prompt: string, images: ImageInput[], aspectRatio: string): Promise<GeneratedImage> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  const parts: Part[] = [
    { type: 'text', text: prompt },
    ...images.map(img => ({ type: 'image' as const, mime_type: img.mimeType, data: img.data })),
  ]
  try {
    return await callInteractions(apiKey, parts, aspectRatio)
  } catch (primary) {
    try {
      return await callGenerateContent(apiKey, parts, aspectRatio)
    } catch {
      throw primary
    }
  }
}

function itemSummary(item: Pick<WardrobeItem, 'name' | 'brand' | 'color' | 'pattern' | 'material' | 'description'>): string {
  return [item.brand, item.name].filter(Boolean).join(' ') +
    ` (${[item.color, item.pattern, item.material].filter(Boolean).join(', ')})` +
    (item.description ? `. ${item.description}` : '')
}

const PRODUCT_STYLE =
  'Clean e-commerce product shot centered on a seamless warm off-white background (#F5F0E8) with a soft natural shadow, even studio lighting, sharp focus. ' +
  'Clothing is shown as a neat flat lay or invisible-mannequin shape; shoes as a three-quarter side view; jewelry as a close-up. ' +
  'No people, hands, hangers, tags, props or text.'

/** A clean 2D product render of one garment, from its photo or (no photo) its description. */
export async function renderItem(
  item: Pick<WardrobeItem, 'name' | 'brand' | 'color' | 'pattern' | 'material' | 'description'>,
  photo: ImageInput | null,
): Promise<GeneratedImage> {
  const prompt = photo
    ? `Using the reference photo, create a product image of ONLY this item: ${itemSummary(item)}. ` +
      'If the photo contains other items, leave them out. Preserve the exact color, wash, pattern, graphics, logos, texture, hardware and proportions. ' +
      PRODUCT_STYLE
    : `Create a realistic product image of this item: ${itemSummary(item)}. ${PRODUCT_STYLE}`
  return generateImage(prompt, photo ? [photo] : [], '1:1')
}

/** An editorial flat lay of a full outfit built from the pieces' renders or photos. */
export async function renderOutfit(
  pieces: { item: Pick<WardrobeItem, 'name' | 'brand' | 'color' | 'pattern' | 'material' | 'description' | 'category'>; image: ImageInput | null }[],
  context: { title: string; occasion: string | null },
): Promise<GeneratedImage> {
  const withImages = pieces.filter(p => p.image)
  const list = pieces.map((p, i) => `${i + 1}. ${p.item.category}: ${itemSummary(p.item)}`).join('\n')
  const prompt =
    `Create one editorial fashion flat-lay photograph of a complete outfit called "${context.title}"` +
    (context.occasion ? ` for ${context.occasion}` : '') +
    `. Use exactly these ${pieces.length} pieces and nothing else:\n${list}\n` +
    (withImages.length
      ? 'The attached images show the real pieces; reproduce each one faithfully (exact colors, graphics, logos, wash and shape). '
      : '') +
    'Arrange them as the outfit would be worn, top-down: outerwear and top at the top, bottoms below, shoes at the bottom, jewelry and accessories placed neatly around. ' +
    'Warm cream linen backdrop, soft natural daylight, magazine styling with generous spacing so every piece is instantly recognizable. No people, mannequins or text.'
  return generateImage(prompt, withImages.map(p => p.image!), '4:5')
}
