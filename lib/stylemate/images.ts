import sharp from 'sharp'
import type { WardrobeItem } from '@/types/stylemate'

// Claude has no image output, so renders come from Gemini's image model: first
// direct (Interactions API, then the older generateContent shape), then through
// OpenRouter's image endpoint, which serves the same model family on another key.
const IMAGE_MODEL = process.env.STYLEMATE_IMAGE_MODEL ?? 'gemini-nano-banana-2.1'
const LEGACY_IMAGE_MODEL = 'gemini-2.5-flash-image'
const OPENROUTER_IMAGE_MODEL = process.env.STYLEMATE_OPENROUTER_IMAGE_MODEL ?? 'google/gemini-2.5-flash-image'
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

// Provider errors can echo the API key back (Google's suspension message does).
function redact(text: string): string {
  return text.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[key]').replace(/sk-[A-Za-z0-9_-]{16,}/g, '[key]')
}

async function providerError(label: string, res: Response): Promise<Error> {
  const body = await res.text()
  let message = body
  try {
    const parsed = JSON.parse(body)
    const err = Array.isArray(parsed) ? parsed[0]?.error : parsed.error
    message = err?.message ?? body
  } catch {
    // Non-JSON error body; keep the raw text.
  }
  return new Error(`${label} ${res.status}: ${redact(String(message)).slice(0, 240)}`)
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
  if (!res.ok) throw await providerError('Gemini', res)
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
  if (!res.ok) throw await providerError('Gemini', res)
  const image = findImage(await res.json())
  if (!image) throw new Error('Gemini returned no image')
  return image
}

async function callOpenRouter(apiKey: string, prompt: string, images: ImageInput[], aspectRatio: string): Promise<GeneratedImage> {
  const res = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: OPENROUTER_IMAGE_MODEL,
      prompt,
      aspect_ratio: aspectRatio,
      ...(images.length
        ? { input_references: images.map(img => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } })) }
        : {}),
    }),
    signal: AbortSignal.timeout(100_000),
  })
  if (!res.ok) throw await providerError('OpenRouter', res)
  const payload = (await res.json()) as { data?: { b64_json?: string; media_type?: string }[] }
  const first = payload.data?.find(d => d.b64_json)
  if (!first?.b64_json) throw new Error('OpenRouter returned no image')
  return { bytes: Buffer.from(first.b64_json, 'base64'), mimeType: first.media_type ?? 'image/png' }
}

async function generateImage(prompt: string, images: ImageInput[], aspectRatio: string): Promise<GeneratedImage> {
  const geminiKey = process.env.GEMINI_API_KEY
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const parts: Part[] = [
    { type: 'text', text: prompt },
    ...images.map(img => ({ type: 'image' as const, mime_type: img.mimeType, data: img.data })),
  ]

  const attempts: (() => Promise<GeneratedImage>)[] = []
  if (geminiKey) {
    attempts.push(() => callInteractions(geminiKey, parts, aspectRatio))
    attempts.push(() => callGenerateContent(geminiKey, parts, aspectRatio))
  }
  if (openRouterKey) attempts.push(() => callOpenRouter(openRouterKey, prompt, images, aspectRatio))
  if (attempts.length === 0) throw new Error('No image provider configured (GEMINI_API_KEY or OPENROUTER_API_KEY)')

  const errors: string[] = []
  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }
  throw new Error(Array.from(new Set(errors)).join(' | '))
}

function itemSummary(item: Pick<WardrobeItem, 'name' | 'brand' | 'color' | 'pattern' | 'material' | 'description'>): string {
  return [item.brand, item.name].filter(Boolean).join(' ') +
    ` (${[item.color, item.pattern, item.material].filter(Boolean).join(', ')})` +
    (item.description ? `. ${item.description}` : '')
}

const PRODUCT_STYLE =
  'Clean e-commerce product shot centered on a seamless warm off-white background (#F5F0E8) with a soft natural shadow, even studio lighting, sharp focus. ' +
  'Clothing is shown as a neat flat lay or invisible-mannequin shape; shoes as a three-quarter side view; jewelry as a close-up; glasses as a front three-quarter view with the temples open. ' +
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

// Google's image model accepts at most 3 reference images through OpenRouter, so
// larger outfits are tiled into one reference sheet (reading order, gaps between
// tiles so pieces don't blend into each other's cream backgrounds).
const MAX_SEPARATE_REFERENCES = 3
const SHEET_TILE = 512
const SHEET_GAP = 16

async function referenceSheet(images: ImageInput[]): Promise<ImageInput> {
  const cols = images.length <= 4 ? 2 : 3
  const rows = Math.ceil(images.length / cols)
  const cell = SHEET_TILE + SHEET_GAP
  const tiles = await Promise.all(
    images.map(img =>
      sharp(Buffer.from(img.data, 'base64'))
        .resize(SHEET_TILE, SHEET_TILE, { fit: 'contain', background: '#F5F0E8' })
        .flatten({ background: '#F5F0E8' })
        .jpeg()
        .toBuffer(),
    ),
  )
  const sheet = await sharp({
    create: { width: cols * cell + SHEET_GAP, height: rows * cell + SHEET_GAP, channels: 3, background: '#CFC3AE' },
  })
    .composite(tiles.map((input, i) => ({ input, left: SHEET_GAP + (i % cols) * cell, top: SHEET_GAP + Math.floor(i / cols) * cell })))
    .jpeg({ quality: 88 })
    .toBuffer()
  return { data: sheet.toString('base64'), mimeType: 'image/jpeg' }
}

type OutfitPiece = {
  item: Pick<WardrobeItem, 'name' | 'brand' | 'color' | 'pattern' | 'material' | 'description' | 'category'>
  image: ImageInput | null
}

/** Numbered piece list plus the reference images (tiled into one sheet past the provider limit). */
async function outfitReferences(pieces: OutfitPiece[]): Promise<{ list: string; references: ImageInput[]; intro: string }> {
  const numbered = pieces.map((p, i) => ({ ...p, n: i + 1 }))
  const withImages = numbered.filter(p => p.image)
  const useSheet = withImages.length > MAX_SEPARATE_REFERENCES
  const references = useSheet ? [await referenceSheet(withImages.map(p => p.image!))] : withImages.map(p => p.image!)
  const list = numbered.map(p => `${p.n}. ${p.item.category}: ${itemSummary(p.item)}`).join('\n')
  const shown = withImages.map(p => p.n).join(', ')
  const intro =
    (useSheet
      ? `The attached reference sheet shows the real pieces ${shown}, one per tile, in reading order (left to right, top to bottom). It is only a reference: do not reproduce the grid. `
      : withImages.length
        ? `The attached images show the real pieces ${shown}, in that order. `
        : '') +
    (withImages.length ? 'Reproduce each pictured piece faithfully (exact colors, graphics, logos, wash and shape). ' : '')
  return { list, references, intro }
}

/** An editorial flat lay of a full outfit built from the pieces' renders or photos. */
export async function renderOutfit(pieces: OutfitPiece[], context: { title: string; occasion: string | null }): Promise<GeneratedImage> {
  const { list, references, intro } = await outfitReferences(pieces)
  const prompt =
    `Create one editorial fashion flat-lay photograph of a complete outfit called "${context.title}"` +
    (context.occasion ? ` for ${context.occasion}` : '') +
    `. Use exactly these ${pieces.length} pieces and nothing else:\n${list}\n` +
    intro +
    'Arrange them as the outfit would be worn, top-down: outerwear and top at the top, bottoms below, shoes at the bottom, jewelry and accessories placed neatly around. ' +
    'Warm cream linen backdrop, soft natural daylight, magazine styling with generous spacing so every piece is instantly recognizable. No people, mannequins or text.'
  return generateImage(prompt, references, '4:5')
}

/**
 * The outfit worn on a lifelike mannequin with a blank, featureless head. Image
 * models ignore "crop out the face" framing on human models, and a crop would
 * cut off the glasses; the mannequin is reliably faceless and can still wear them.
 */
export async function renderOnModel(
  pieces: OutfitPiece[],
  context: { title: string; occasion: string | null; stylingTip: string | null },
): Promise<GeneratedImage> {
  const { list, references, intro } = await outfitReferences(pieces)
  const hasEyewear = pieces.some(p => p.item.category === 'eyewear')
  const prompt =
    'Create a photorealistic full-length editorial fashion photograph of a lifelike full-size male mannequin with realistic athletic proportions ' +
    `and a smooth, completely featureless matte head (no eyes, nose, mouth or hair), wearing the complete outfit "${context.title}"` +
    (context.occasion ? ` for ${context.occasion}` : '') +
    `. It wears exactly these ${pieces.length} pieces and no other clothing or accessories:\n${list}\n` +
    intro +
    'Every graphic, patch or logo stays on the piece it belongs to. ' +
    'Show the whole mannequin from head to shoes in a natural relaxed standing pose. ' +
    (hasEyewear ? 'The glasses sit on the blank head where the eyes would be. ' : '') +
    (context.stylingTip ? `Style it this way: ${context.stylingTip} ` : '') +
    'True-to-life fit and drape, seamless warm cream studio backdrop, soft natural daylight. No text or added logos.'
  return generateImage(prompt, references, '4:5')
}
