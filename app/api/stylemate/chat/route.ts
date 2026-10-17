import type Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { todayEastern } from '@/lib/dates'
import { claudeClient, FALLBACK_PARAMS } from '@/lib/stylemate/claude'
import { CLAUDE_MODEL } from '@/lib/stylemate/constants'
import { errorMessage, requireOwner } from '@/lib/stylemate/server'
import { describeDay, fetchForecast } from '@/lib/stylemate/weather'
import type { Outfit, StylistMessage, WardrobeItem } from '@/types/stylemate'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_HISTORY = 30
const MAX_PAUSE_RESUMES = 3

const SYSTEM = `You are the owner's personal stylist inside StyleMate, their private wardrobe app. You know their full closet (below), their planned outfits and the local forecast.

You help with: what to wear for specific plans, how to style a given piece, what to buy next for the season, gaps in the wardrobe, inspiration and current trends, color and fit advice, and packing lists.

How to answer:
- Ground advice in their actual closet. When you mention one of their pieces, write its tag exactly as [[item:REF]] using the 8-character ref from the closet list; the app turns it into a thumbnail. Never invent refs.
- For shopping advice, name concrete pieces (color, fabric, fit, price tier) and say which existing items each one unlocks. Prefer versatile pieces that create several new outfits.
- Use web search for trends, current drops, prices or anything time-sensitive; cite the source names briefly. Don't search for things you can answer from the closet.
- Be direct and confident like a stylist friend with taste. Short paragraphs or tight lists; no filler. Use light markdown (bold, lists) only when it helps.`

function closetContext(items: WardrobeItem[], planned: Outfit[], forecast: string): string {
  const byId = new Map(items.map(i => [i.id, i]))
  const owned = items.filter(i => !i.is_incoming)
  const incoming = items.filter(i => i.is_incoming)
  const line = (i: WardrobeItem) =>
    [
      i.id.slice(0, 8),
      i.name,
      `${i.category}${i.sub_type ? `/${i.sub_type}` : ''}`,
      i.color,
      i.pattern,
      i.fit,
      i.brand,
      `formality ${i.formality}`,
      i.style_tags.join('/'),
      i.status !== 'clean' ? i.status : null,
      i.wear_count ? `worn ${i.wear_count}x` : null,
    ].filter(Boolean).join(' | ')

  const plannedLines = planned.map(o => {
    const names = o.item_ids.map(id => byId.get(id)?.name).filter(Boolean).join(', ')
    return `${o.plan_date} ${o.slot}: "${o.title}" = ${names}`
  })

  return [
    `Today is ${todayEastern()}.`,
    `FORECAST:\n${forecast}`,
    `CLOSET (${owned.length} pieces; ref | name | type | color | pattern | fit | brand | formality | style):\n${owned.map(line).join('\n') || '(empty so far)'}`,
    incoming.length ? `ON THE WAY (ordered, not delivered yet):\n${incoming.map(line).join('\n')}` : null,
    plannedLines.length ? `PLANNED OUTFITS:\n${plannedLines.join('\n')}` : null,
  ].filter(Boolean).join('\n\n')
}

export async function POST(request: Request) {
  const auth = await requireOwner()
  if (!auth.ok) return auth.response
  const { supabase, user } = auth

  const body = (await request.json().catch(() => ({}))) as { messages?: StylistMessage[] }
  const history = (body.messages ?? [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_HISTORY)
  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Send a message first' }, { status: 400 })
  }
  while (history[0]?.role === 'assistant') history.shift()

  const today = todayEastern()
  const [{ data: itemRows }, { data: outfitRows }, forecast] = await Promise.all([
    supabase.from('wardrobe_items').select('*').eq('user_id', user.id).order('category'),
    supabase.from('stylemate_outfits').select('*').eq('user_id', user.id).gte('plan_date', today).order('plan_date').limit(40),
    fetchForecast(today, 7),
  ])

  const context = closetContext((itemRows as WardrobeItem[]) ?? [], (outfitRows as Outfit[]) ?? [], forecast.map(describeDay).map((d, i) => `${forecast[i].date}: ${d}`).join('\n'))

  const messages: Anthropic.Beta.BetaMessageParam[] = history.map(m => ({ role: m.role, content: m.text }))
  const client = claudeClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let attempt = 0; attempt <= MAX_PAUSE_RESUMES; attempt++) {
          const run = client.beta.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: 16000,
            ...FALLBACK_PARAMS,
            system: [
              { type: 'text', text: SYSTEM },
              { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
            ],
            output_config: { effort: 'medium' },
            tools: [
              {
                type: 'web_search_20260209',
                name: 'web_search',
                max_uses: 5,
                user_location: { type: 'approximate', city: 'Indianapolis', region: 'Indiana', country: 'US', timezone: 'America/New_York' },
              },
            ],
            messages,
          })
          run.on('text', delta => controller.enqueue(encoder.encode(delta)))
          const final = await run.finalMessage()

          if (final.stop_reason === 'refusal') {
            controller.enqueue(encoder.encode('\n\n_I can’t help with that one._'))
            break
          }
          if (final.stop_reason !== 'pause_turn') break
          messages.push({ role: 'assistant', content: final.content })
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n_Stylist error: ${errorMessage(err)}_`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
