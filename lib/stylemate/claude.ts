import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod/v4'
import { CATEGORY_VALUES, CLAUDE_MODEL } from '@/lib/stylemate/constants'
import type { ItemTags } from '@/types/stylemate'

// The account key is org-level (not workspace-scoped), so every request must name
// a workspace via this header or the API rejects it.
export function claudeClient(): Anthropic {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID
  return new Anthropic({
    defaultHeaders: workspaceId ? { 'anthropic-workspace-id': workspaceId } : undefined,
  })
}

// Server-side refusal fallback: if a safety classifier declines, the API reroutes
// the same request to a fallback model inside the call.
export const FALLBACK_PARAMS = {
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default' as const,
}

export class ClaudeRefusalError extends Error {}

const itemTagsSchema = z.object({
  is_wearable: z.boolean(),
  name: z.string(),
  category: z.enum(CATEGORY_VALUES),
  sub_type: z.string(),
  color: z.string(),
  color_hex: z.string(),
  colors: z.array(z.string()),
  pattern: z.string(),
  material: z.string(),
  fit: z.string(),
  brand: z.string().nullable(),
  description: z.string(),
  formality: z.number().int(),
  warmth: z.number().int(),
  seasons: z.array(z.string()),
  occasions: z.array(z.string()),
  style_tags: z.array(z.string()),
  min_temp_threshold: z.number().int(),
  max_temp_threshold: z.number().int(),
})

const tagResultSchema = z.object({ items: z.array(itemTagsSchema) })

const TAGGING_SYSTEM = `You catalog clothing for a personal wardrobe app that later builds outfits from the catalog, so every attribute should help a stylist match pieces.

For each distinct wearable item, return:
- is_wearable: false only for things that are not clothing, shoes, jewelry, bags or accessories.
- name: short shoppable name, 2-6 words, Title Case, color first (e.g. "Black Boxy Heavyweight Tee", "Gold Cuban Link Chain").
- category: top (shirts, tees, polos, sweaters, hoodies), bottom (pants, jeans, shorts, joggers), outerwear (jackets, coats, overshirts, puffers), footwear, jewelry (chains, rings, bracelets, earrings, watches), eyewear (glasses and sunglasses), accessory (hats, belts, scarves, socks), bag.
- For eyewear, sub_type is exactly "glasses" (clear lenses) or "sunglasses" (tinted or dark lenses), and the description names the frame shape (round, square, rectangular, aviator, cat-eye, oval, browline, wayfarer), frame material and lens tint. The owner's eyewear is all prescription.
- sub_type: snake_case specific type (e.g. graphic_tee, cargo_pants, zip_hoodie, chelsea_boots, low_top_sneakers, cuban_chain).
- color: dominant color in plain words (e.g. "washed black", "cream", "olive"). color_hex: closest 6-digit hex for it. colors: every notable color, dominant first.
- pattern: solid, striped, checked, graphic, logo, camo, floral, textured, colorblock, etc.
- material: best guess (cotton jersey, denim, fleece, nylon, leather, suede, knit, linen, metal, etc.).
- fit: slim, regular, relaxed, oversized, boxy, cropped, skinny, straight, wide, tapered, or n/a.
- brand: only if a logo or label is clearly visible or given; otherwise null.
- description: one sentence a stylist would use: notable details (graphics, distressing, hardware, cut) that distinguish it.
- formality: 1 gym/lounge, 2 casual, 3 smart casual, 4 dressy, 5 formal.
- warmth: 1 very light (tank, linen), 2 light (tee), 3 medium (sweatshirt, jeans), 4 warm (heavy knit, fleece), 5 winter (puffer, wool coat).
- seasons: any of spring, summer, fall, winter.
- occasions: any of class, casual, gym, going_out, formal, lounge, date, work.
- style_tags: 1-4 aesthetics (streetwear, minimalist, old money, athleisure, smart casual, y2k, preppy, techwear, vintage, workwear, classic).
- min_temp_threshold / max_temp_threshold: comfortable outdoor range in °F when worn as intended.

If the photo shows several separate items (e.g. a pile or a laid-out outfit), return one entry per item, max 8. Ignore background objects, hangers and people.`

function clampInt(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(n)))
}

function normalizeTags(raw: z.infer<typeof itemTagsSchema>): ItemTags {
  const hex = /^#?[0-9a-f]{6}$/i.test(raw.color_hex.trim()) ? `#${raw.color_hex.trim().replace('#', '')}` : '#888888'
  const min = clampInt(raw.min_temp_threshold, -20, 110)
  const max = clampInt(raw.max_temp_threshold, -20, 115)
  return {
    name: raw.name.trim() || 'Clothing item',
    category: raw.category,
    sub_type: raw.sub_type.trim(),
    color: raw.color.trim().toLowerCase() || 'unknown',
    color_hex: hex.toUpperCase(),
    colors: raw.colors.map(c => c.trim().toLowerCase()).filter(Boolean).slice(0, 5),
    pattern: raw.pattern.trim().toLowerCase(),
    material: raw.material.trim().toLowerCase(),
    fit: raw.fit.trim().toLowerCase(),
    brand: raw.brand?.trim() || null,
    description: raw.description.trim(),
    formality: clampInt(raw.formality, 1, 5),
    warmth: clampInt(raw.warmth, 1, 5),
    seasons: raw.seasons.map(s => s.trim().toLowerCase()).filter(Boolean),
    occasions: raw.occasions.map(s => s.trim().toLowerCase()).filter(Boolean),
    style_tags: raw.style_tags.map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 4),
    min_temp_threshold: Math.min(min, max),
    max_temp_threshold: Math.max(min, max),
  }
}

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

/**
 * Tag the garment(s) in a photo, or a single garment described only by text (Gmail
 * order lines without a usable product image). `single` forces exactly one item.
 */
export async function tagClothing(input: {
  image?: { data: string; mediaType: ImageMediaType } | null
  hint?: string | null
  single?: boolean
}): Promise<ItemTags[]> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = []
  if (input.image) {
    content.push({ type: 'image', source: { type: 'base64', media_type: input.image.mediaType, data: input.image.data } })
  }
  const instructions = [
    input.single
      ? 'Catalog exactly one item: the product described below. Return a single entry.'
      : 'Catalog every distinct wearable item in this photo.',
    input.hint ? `Known details from the order or owner: ${input.hint}` : null,
  ].filter(Boolean).join('\n')
  content.push({ type: 'text', text: instructions })

  const response = await claudeClient().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    ...FALLBACK_PARAMS,
    system: TAGGING_SYSTEM,
    output_config: { effort: 'low', format: betaZodOutputFormat(tagResultSchema) },
    messages: [{ role: 'user', content }],
  })

  if (response.stop_reason === 'refusal') throw new ClaudeRefusalError('Claude declined to tag this image')
  const parsed = response.parsed_output
  if (!parsed) throw new Error('Claude returned no tags')

  const items = parsed.items.filter(i => i.is_wearable).map(normalizeTags)
  return input.single ? items.slice(0, 1) : items.slice(0, 8)
}
