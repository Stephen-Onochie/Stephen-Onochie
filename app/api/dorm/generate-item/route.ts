import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { itemSpecSchema, itemDimsSchema, normalizeSpecCandidate, type ItemSpec } from '@/lib/dorm/spec'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

function systemPrompt(name: string, wFt: number, dFt: number, hFt: number) {
  return (
    `You convert a photo of one piece of furniture into a charming low-poly 3D "primitive assembly" for a stylized, cozy, Sims-like dorm room. ` +
    `Respond with STRICT JSON only, no markdown fences, matching: {"parts":[Part,...]}. All lengths are in feet.\n` +
    `Shapes:\n` +
    `- "box": needs "size": [width,height,depth]\n` +
    `- "cylinder": needs "radius" and "height" (optional "radiusTop" for taper); stands upright on Y\n` +
    `- "sphere": needs "radius"; combine with "scale" for ellipsoids and soft blobs\n` +
    `- "capsule": needs "radius" and "height" (the straight mid-section); upright on Y unless rotated; ideal for cushions, pillows, padded arms\n` +
    `- "torus": needs "radius" and "tube"; ring lies vertical facing z unless rotated; use thin ones for piping, rims, seams\n` +
    `Every part needs "position": [x,y,z] = the part's CENTER before scaling, with y measured up from the floor (floor is y=0). ` +
    `Any part may also have "scale": [sx,sy,sz] (0.1-4, squash or stretch), "rotationX"/"rotationY"/"rotationZ" in degrees, ` +
    `"roughness" 0-1, "metalness" 0-1, and needs "color" as a 6-digit hex STRING like "#8a6647" (never a color name, never rgb()).\n` +
    `Style rules, in priority order:\n` +
    `1. Soft things must LOOK soft. Bean bags, cushions, pillows, and upholstered seats are squashed spheres and capsules, never bare boxes. Overlap two or three blobs so the form slumps naturally.\n` +
    `2. Suggest texture with geometry: a row of small spheres for tufting, thin boxes or tori for seams and piping, a slightly rotated part so nothing feels machine-stiff.\n` +
    `3. Use 2 to 4 related colors sampled from the photo (base tone, a darker shadow tone, an accent), slightly warmed to sit well in a beige/wood-toned room. Never one flat color for the whole item.\n` +
    `4. Add 1 to 3 small, fitting accents that make it feel lived-in: a throw pillow on seating, a folded blanket, a book or mug on a flat surface, a knob or handle where the real item has one. Accents sit inside the bounding box.\n` +
    `The item is "${name}" and must fit a bounding box exactly ${wFt.toFixed(2)} ft wide (x), ${dFt.toFixed(2)} ft deep (z), ${hFt.toFixed(2)} ft tall (y). ` +
    `Center the footprint at x=0, z=0; the lowest part must rest on the floor. ` +
    `Use 6 to 28 parts. Capture the silhouette first, then the key features, then the accents. ` +
    `No part may extend past the bounding box by more than 10%.`
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user.email !== allowedEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OpenRouter not configured' }, { status: 500 })

  let body: { image?: string; name?: string; dims?: unknown; feedback?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!body.image?.startsWith('data:image/')) {
    return NextResponse.json({ error: 'image (data URL) is required' }, { status: 400 })
  }
  if (body.image.length > 6 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large; resize before upload' }, { status: 400 })
  }
  const dims = itemDimsSchema.safeParse(body.dims)
  if (!dims.success) return NextResponse.json({ error: 'Invalid dims' }, { status: 400 })
  const wFt = dims.data.w / 12, dFt = dims.data.d / 12, hFt = dims.data.h / 12

  const model = process.env.DORM_VISION_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_MODEL
  const userContent: unknown[] = [
    { type: 'image_url', image_url: { url: body.image } },
    {
      type: 'text',
      text:
        `Build the primitive assembly for this ${name}.` +
        (body.feedback ? ` Adjustments requested on the previous attempt: ${body.feedback}` : ''),
    },
  ]

  async function callModel(extraNote?: string) {
    const messages: unknown[] = [
      { role: 'system', content: systemPrompt(name!, wFt, dFt, hFt) },
      { role: 'user', content: userContent },
    ]
    if (extraNote) messages.push({ role: 'user', content: extraNote })
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
    })
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
    const json = await res.json()
    return String(json.choices?.[0]?.message?.content ?? '')
  }

  function parseSpec(raw: string): ItemSpec | { error: string } {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end <= start) return { error: 'No JSON object in response' }
    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1))
    } catch (e) {
      return { error: `JSON parse failed: ${e instanceof Error ? e.message : 'unknown'}` }
    }
    const result = itemSpecSchema.safeParse(normalizeSpecCandidate(parsed))
    if (!result.success) return { error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }
    return result.data
  }

  try {
    let raw = await callModel()
    let spec = parseSpec(raw)
    if ('error' in spec) {
      raw = await callModel(
        `Your previous response was invalid (${spec.error}). Respond again with ONLY the corrected strict JSON object.`
      )
      spec = parseSpec(raw)
    }
    if ('error' in spec) {
      return NextResponse.json({ error: `Model returned an invalid spec: ${spec.error}` }, { status: 502 })
    }
    return NextResponse.json({ spec: { ...spec, name } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Generation failed' }, { status: 502 })
  }
}
