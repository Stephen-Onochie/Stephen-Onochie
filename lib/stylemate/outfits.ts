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
- Repeats (the owner's standing rule): a T-shirt is never repeated. Every piece marked TEE in the closet appears in at most one outfit across the entire request, and TEEs marked "worn recently" are only used once every other TEE is taken. Pants, shorts, outerwear (the worker jacket included), sweaters, hoodies, shoes, jewelry and accessories may repeat freely, even on back-to-back days. Within one request, options must still differ meaningfully.
- Sweaters (the owner's standing rule): a piece marked SWEATER is the only top in its outfit. Never layer it with a tee, shirt or other top, and never put a jacket or coat over it. Only pick a sweater when it is warm enough on its own for the weather; on colder days build the look from a top plus outerwear instead.
- Eyewear (the owner's standing rule): they wear prescription glasses every day and all their sunglasses are prescription too. When the closet has eyewear, every outfit includes exactly one pair. Sunglasses only for daytime outdoor outfits on clear or partly cloudy days; clear frames for the gym (indoors), night, going-out, overcast or rainy looks. Pick the frame whose color, shape and formality suit the outfit. Glasses repeat freely.
- Small closet: if a perfect outfit is impossible, build the best available and use styling_tip to name the one piece that would complete it.

Writing:
- title: 2-5 punchy words (e.g. "Tonal Earth Layers", "Monochrome Night Out").
- reasoning: 1-2 sentences on why the colors and shapes work together. Specific, not hype.
- styling_tip: one concrete wearing tip (tuck, cuff, layer, sleeve push, accessory placement) or the missing-piece note.

Return one entry per requested outfit, with key copied from its brief.`

const LAYER_TOP = /hoodie|sweat|sweater|cardigan|knit|fleece|zip|jumper|crewneck_sweat/i
const RECENT_WEAR_DAYS = 14

/** Tops worn against the skin (tees, tanks, polos, shirts) follow the no-repeat rule; layering tops don't. */
export function isTee(item: Pick<WardrobeItem, 'category' | 'sub_type' | 'name'>): boolean {
  return item.category === 'top' && !LAYER_TOP.test(`${item.sub_type ?? ''} ${item.name}`)
}

const SWEATER = /sweater|jumper|cardigan|pullover|turtleneck/i

export function isSweater(item: Pick<WardrobeItem, 'category' | 'sub_type' | 'name'>): boolean {
  return item.category === 'top' && SWEATER.test(`${item.sub_type ?? ''} ${item.name}`)
}

function recentlyWorn(item: Pick<WardrobeItem, 'last_worn_on'>): boolean {
  if (!item.last_worn_on) return false
  return Date.now() - new Date(`${item.last_worn_on}T12:00:00Z`).getTime() < RECENT_WEAR_DAYS * 86_400_000
}

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
        isTee(item) ? `TEE${recentlyWorn(item) ? ' (worn recently)' : ''}` : null,
        isSweater(item) ? 'SWEATER (worn alone: no other top, no outerwear)' : null,
        item.category === 'eyewear' ? (isSunglasses(item) ? 'PRESCRIPTION SUNGLASSES' : 'PRESCRIPTION GLASSES') : null,
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

/** Closet items an outfit may draw from: everything owned (not still shipping). */
export async function loadWearableItems(supabase: SupabaseClient, userId: string): Promise<WardrobeItem[]> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', userId)
    .eq('is_incoming', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as WardrobeItem[]) ?? []
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
  const outfits = parsed.outfits
    .filter(o => validKeys.has(o.key))
    .map(o => ({
      key: o.key,
      title: o.title.trim(),
      item_ids: Array.from(new Set(o.item_refs.map(r => refToId.get(r.trim())).filter((id): id is string => !!id))),
      reasoning: o.reasoning.trim(),
      styling_tip: o.styling_tip.trim(),
    }))
    .filter(o => o.item_ids.length >= 2)

  return enforceEyewear(enforceSweaterAlone(await enforceNoRepeatTees(outfits, items), items), items, briefs)
}

/** A sweater is the outfit's only top layer: drop any other tops and outerwear around it. */
function enforceSweaterAlone(outfits: GeneratedOutfit[], items: WardrobeItem[]): GeneratedOutfit[] {
  const byId = new Map(items.map(i => [i.id, i]))
  return outfits.map(outfit => {
    const sweater = outfit.item_ids.map(id => byId.get(id)).find(i => i && isSweater(i))
    if (!sweater) return outfit
    const item_ids = outfit.item_ids.filter(id => {
      const item = byId.get(id)
      if (!item || id === sweater.id) return true
      return item.category !== 'top' && item.category !== 'outerwear'
    })
    return { ...outfit, item_ids }
  })
}

const SUNNY = new Set(['Clear', 'Mainly clear', 'Partly cloudy'])
const NO_SUNGLASSES_OCCASION = /night|party|club|lounge|date|dinner|going out|event|gym|workout|training/i

function isSunglasses(item: Pick<WardrobeItem, 'sub_type'>): boolean {
  return item.sub_type === 'sunglasses'
}

/**
 * Every outfit wears exactly one pair of the owner's prescription glasses:
 * sunglasses only outdoors by day in sun, clear frames otherwise (gym, night, gloom). Claude usually gets this
 * right; this keeps it true, choosing the frame closest in formality to the look.
 */
function enforceEyewear(outfits: GeneratedOutfit[], items: WardrobeItem[], briefs: OutfitBrief[]): GeneratedOutfit[] {
  const eyewear = items.filter(i => i.category === 'eyewear')
  if (eyewear.length === 0) return outfits
  const byId = new Map(items.map(i => [i.id, i]))
  const briefByKey = new Map(briefs.map(b => [b.key, b]))

  return outfits.map(outfit => {
    const brief = briefByKey.get(outfit.key)
    const sunnyDay = !!brief && SUNNY.has(brief.weather.condition) && brief.weather.precipChance < 40
      && brief.slot !== 'going_out' && brief.slot !== 'gym' && !NO_SUNGLASSES_OCCASION.test(brief.occasion)
    const allowed = eyewear.filter(e => sunnyDay || !isSunglasses(e))
    if (allowed.length === 0) return outfit

    const pieces = outfit.item_ids.map(id => byId.get(id)).filter((i): i is WardrobeItem => !!i)
    const chosen = pieces.filter(p => p.category === 'eyewear')
    const keep = chosen.find(c => allowed.some(a => a.id === c.id))
    const others = outfit.item_ids.filter(id => byId.get(id)?.category !== 'eyewear')
    if (keep) return { ...outfit, item_ids: [...others, keep.id] }

    const nonEyewear = pieces.filter(p => p.category !== 'eyewear')
    const formality = nonEyewear.reduce((n, p) => n + p.formality, 0) / Math.max(1, nonEyewear.length)
    const best = [...allowed].sort((a, b) => Math.abs(a.formality - formality) - Math.abs(b.formality - formality))[0]
    return { ...outfit, item_ids: [...others, best.id] }
  })
}

const swapSchema = z.object({ swaps: z.array(z.object({ outfit: z.number().int(), tee_ref: z.string() })) })

/**
 * Claude follows the no-repeat-tee rule most of the time; this guarantees it when
 * the closet allows. Later duplicates get a replacement tee picked by Claude from
 * the unused ones so the colors still work. With no unused tees left the repeat stays.
 */
async function enforceNoRepeatTees(outfits: GeneratedOutfit[], items: WardrobeItem[]): Promise<GeneratedOutfit[]> {
  const byId = new Map(items.map(i => [i.id, i]))
  const used = new Set<string>()
  const conflicts: { index: number; teeId: string }[] = []
  outfits.forEach((o, index) => {
    for (const id of o.item_ids) {
      const item = byId.get(id)
      if (!item || !isTee(item)) continue
      if (used.has(id)) conflicts.push({ index, teeId: id })
      used.add(id)
    }
  })

  const spare = items.filter(i => isTee(i) && !used.has(i.id))
  if (conflicts.length === 0 || spare.length === 0) return outfits

  const refOf = new Map(items.map((item, i) => [item.id, itemRef(i)]))
  const idOfRef = new Map(items.map((item, i) => [itemRef(i), item.id]))
  const describe = (o: GeneratedOutfit) => o.item_ids.map(id => `${refOf.get(id)} ${byId.get(id)?.name}`).join(', ')

  const response = await claudeClient().beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    ...FALLBACK_PARAMS,
    output_config: { effort: 'low', format: betaZodOutputFormat(swapSchema) },
    messages: [{
      role: 'user',
      content:
        `These outfits reuse a T-shirt that another outfit already uses. The owner never repeats a T-shirt. ` +
        `For each, pick the replacement tee (by ref) from the unused tees that best fits the outfit's colors and formality. ` +
        `Each unused tee can be given to only one outfit; if there are more outfits than tees, skip the hardest fits.\n\n` +
        `Outfits to fix:\n${conflicts.map(c => `outfit ${c.index}: "${outfits[c.index].title}" = ${describe(outfits[c.index])}; replace ${refOf.get(c.teeId)}`).join('\n')}\n\n` +
        `Unused tees:\n${spare.map(s => `${refOf.get(s.id)} ${s.name} (${s.color}, formality ${s.formality})`).join('\n')}`,
    }],
  })
  const swaps = response.stop_reason === 'refusal' ? [] : response.parsed_output?.swaps ?? []

  const spareIds = new Set(spare.map(s => s.id))
  const next = outfits.map(o => ({ ...o, item_ids: [...o.item_ids] }))
  for (const swap of swaps) {
    const conflict = conflicts.find(c => c.index === swap.outfit)
    const newId = idOfRef.get(swap.tee_ref.trim())
    if (!conflict || !newId || !spareIds.has(newId)) continue
    spareIds.delete(newId)
    next[swap.outfit].item_ids = next[swap.outfit].item_ids.map(id => (id === conflict.teeId ? newId : id))
  }
  return next
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
