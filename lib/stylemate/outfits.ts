import type { SupabaseClient } from '@supabase/supabase-js'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod/v4'
import { claudeClient, ClaudeRefusalError, FALLBACK_PARAMS } from '@/lib/stylemate/claude'
import { addDaysToDateStr } from '@/lib/dates'
import { CLAUDE_MODEL } from '@/lib/stylemate/constants'
import { describeDay } from '@/lib/stylemate/weather'
import type { DayWeather, Outfit, OutfitOrigin, OutfitSlot, WardrobeItem } from '@/types/stylemate'

export interface OutfitBrief {
  key: string
  date: string
  slot: OutfitSlot
  occasion: string
  palette?: string | null
  weather: DayWeather
  count: number
  notes?: string | null
}

const outfitSchema = z.object({
  outfits: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      item_refs: z.array(z.string()),
      reasoning: z.string(),
      styling_tip: z.string(),
    }),
  ),
})

const STYLIST_SYSTEM = `You are the personal stylist inside StyleMate, a private wardrobe app. You build outfits ONLY from the owner's closet listed below, referencing pieces by their ref (e.g. "i7"). Never invent pieces.

What makes a fire outfit here:
- Complete: a top (or layered tops), a bottom and footwear every time. Add outerwear when the high is under ~60°F, when it is rainy or windy, or when a layer clearly elevates the look. Add jewelry, a hat, belt or bag when it sharpens the fit; skip it when it would clutter.
- Color: build around the requested palette when one is given (neutrals like black, white, cream, grey, denim and tan are always allowed as supporting colors). Without a palette, pick a deliberate scheme (tonal, complementary, or neutral base with one accent) and name it in the reasoning.
- Proportion and silhouette: balance fits (boxy or oversized top with straight or tapered bottoms, slim with relaxed), and keep formality levels within one step of each other unless the contrast is intentional (e.g. tee under an overcoat).
- Weather: respect each item's temperature range and warmth; on rain days avoid suede and pristine white sneakers if alternatives exist.
- Occasion: match the brief's energy. Gym = functional athletic pieces. Class = comfortable but put-together. Casual = relaxed but obviously styled. Going out = the sharpest pieces available.
- Variety: within one request, options must differ meaningfully. Across a multi-day plan, spread the closet: avoid repeating the same non-gym top or bottom more than twice in a week and never on consecutive days. Shoes, jewelry, outerwear and gym pieces may repeat. Prefer items not worn recently.
- Small closet: if a perfect outfit is impossible, build the best available and use styling_tip to name the one piece that would complete it.

Writing:
- title: 2-5 punchy words (e.g. "Tonal Earth Layers", "Monochrome Night Out").
- reasoning: 1-2 sentences on why the colors and shapes work together. Specific, not hype.
- styling_tip: one concrete wearing tip (tuck, cuff, layer, sleeve push, accessory placement) or the missing-piece note.

Return one entry per requested outfit, with key copied from its brief.`

function itemRef(index: number): string {
  return `i${index + 1}`
}

function serializeCloset(items: WardrobeItem[]): string {
  return items
    .map((item, i) => {
      const bits = [
        `${itemRef(i)} | ${item.name} | ${item.category}${item.sub_type ? `/${item.sub_type}` : ''}`,
        `color ${item.color}${item.colors.length > 1 ? ` (${item.colors.join(', ')})` : ''}`,
        item.pattern && item.pattern !== 'solid' ? item.pattern : null,
        item.material,
        item.fit && item.fit !== 'n/a' ? `${item.fit} fit` : null,
        `formality ${item.formality}/5`,
        `warmth ${item.warmth}/5`,
        `${item.min_temp_threshold}-${item.max_temp_threshold}°F`,
        item.style_tags.length ? item.style_tags.join('/') : null,
        item.last_worn_on ? `last worn ${item.last_worn_on}` : null,
      ]
      return bits.filter(Boolean).join(' | ')
    })
    .join('\n')
}

function serializeBrief(b: OutfitBrief): string {
  return [
    `key: ${b.key}`,
    `date: ${b.date}`,
    `occasion: ${b.occasion}`,
    `weather: ${describeDay(b.weather)}`,
    b.palette ? `palette: ${b.palette}` : 'palette: stylist choice',
    b.notes ? `owner notes: ${b.notes}` : null,
    `outfits wanted: ${b.count}`,
  ].filter(Boolean).join('\n')
}

/** Closet items an outfit may draw from: owned (not still shipping) and clean. */
export async function loadWearableItems(supabase: SupabaseClient, userId: string): Promise<WardrobeItem[]> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', userId)
    .eq('is_incoming', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data as WardrobeItem[]) ?? []).filter(i => i.status === 'clean')
}

export interface GeneratedOutfit {
  key: string
  title: string
  item_ids: string[]
  reasoning: string
  styling_tip: string
}

export async function generateOutfits(items: WardrobeItem[], briefs: OutfitBrief[]): Promise<GeneratedOutfit[]> {
  if (items.length < 2) throw new Error('Add at least a top, a bottom and shoes to your closet first.')

  const refToId = new Map(items.map((item, i) => [itemRef(i), item.id]))
  const total = briefs.reduce((n, b) => n + b.count, 0)

  const response = await claudeClient().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: Math.min(20000, 4000 + total * 550),
    ...FALLBACK_PARAMS,
    system: [
      { type: 'text', text: STYLIST_SYSTEM },
      { type: 'text', text: `CLOSET (${items.length} pieces):\n${serializeCloset(items)}`, cache_control: { type: 'ephemeral' } },
    ],
    output_config: { effort: 'medium', format: betaZodOutputFormat(outfitSchema) },
    messages: [
      {
        role: 'user',
        content: `Build ${total} outfit${total === 1 ? '' : 's'} for these briefs:\n\n${briefs.map(serializeBrief).join('\n\n')}`,
      },
    ],
  })

  if (response.stop_reason === 'refusal') throw new ClaudeRefusalError('Claude declined to build outfits')
  const parsed = response.parsed_output
  if (!parsed) throw new Error('Claude returned no outfits')

  const validKeys = new Set(briefs.map(b => b.key))
  return parsed.outfits
    .filter(o => validKeys.has(o.key))
    .map(o => ({
      key: o.key,
      title: o.title.trim(),
      item_ids: Array.from(new Set(o.item_refs.map(r => refToId.get(r.trim())).filter((id): id is string => !!id))),
      reasoning: o.reasoning.trim(),
      styling_tip: o.styling_tip.trim(),
    }))
    .filter(o => o.item_ids.length >= 2)
}

function sundayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return addDaysToDateStr(date, -new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay())
}

export async function generateAndStoreOutfits(
  supabase: SupabaseClient,
  userId: string,
  briefs: OutfitBrief[],
  origin: OutfitOrigin,
): Promise<Outfit[]> {
  const items = await loadWearableItems(supabase, userId)
  const generated = await generateOutfits(items, briefs)
  const byKey = new Map(briefs.map(b => [b.key, b]))

  const rows = generated.map(g => {
    const brief = byKey.get(g.key)!
    return {
      user_id: userId,
      plan_date: brief.date,
      slot: brief.slot,
      origin,
      week_start: sundayOf(brief.date),
      title: g.title,
      occasion: brief.occasion,
      palette: brief.palette ?? null,
      item_ids: g.item_ids,
      reasoning: g.reasoning,
      styling_tip: g.styling_tip,
      weather: brief.weather,
    }
  })
  if (rows.length === 0) throw new Error('No valid outfits came back. Try again.')

  const { data, error } = await supabase.from('stylemate_outfits').insert(rows).select('*')
  if (error) throw error
  return (data as Outfit[]) ?? []
}
