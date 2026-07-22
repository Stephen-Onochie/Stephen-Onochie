import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

const parsedSchema = z.object({
  title: z.string(),
  due_at: z.string().nullable(),
  priority: z.number().int().min(0).max(3),
  project: z.string().nullable(),
  tags: z.array(z.string()),
})
type Parsed = z.infer<typeof parsedSchema>

function systemPrompt(now: string, projects: string[]): string {
  return (
    `You convert one line of natural language into a structured task. ` +
    `Respond with STRICT JSON only, no markdown fences, matching exactly: ` +
    `{"title": string, "due_at": string|null, "priority": 0|1|2|3, "project": string|null, "tags": string[]}.\n` +
    `- title: the task text with date/priority/project/tag tokens removed.\n` +
    `- due_at: an ISO 8601 datetime resolved relative to now (${now}), or null if no date/time is implied. Default an all-day date to 09:00 local.\n` +
    `- priority: 1 (highest) to 3, or 0 if none implied. "!p1"/"urgent"/"asap" → 1.\n` +
    `- project: the best match from this list (return the exact name) or null: ${projects.length ? projects.join(', ') : '(none)'}.\n` +
    `- tags: short lowercase labels the user tagged (e.g. #errands → "errands"); [] if none.`
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

  let body: { text?: string; projects?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const text = body.text?.trim()
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })
  const projects = Array.isArray(body.projects) ? body.projects.filter(p => typeof p === 'string') : []

  const model = process.env.TODO_PARSE_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_MODEL

  async function callModel(extraNote?: string): Promise<string> {
    const messages: unknown[] = [
      { role: 'system', content: systemPrompt(new Date().toISOString(), projects) },
      { role: 'user', content: text! },
    ]
    if (extraNote) messages.push({ role: 'user', content: extraNote })
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0 }),
    })
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
    const json = await res.json()
    return String(json.choices?.[0]?.message?.content ?? '')
  }

  function parse(raw: string): Parsed | { error: string } {
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
    const result = parsedSchema.safeParse(parsed)
    if (!result.success) return { error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }
    return result.data
  }

  try {
    let raw = await callModel()
    let result = parse(raw)
    if ('error' in result) {
      raw = await callModel(`Your previous response was invalid (${result.error}). Respond again with ONLY the corrected strict JSON object.`)
      result = parse(raw)
    }
    if ('error' in result) {
      // Graceful degradation: return the raw line as the title.
      return NextResponse.json({ title: text, due_at: null, priority: 0, project: null, tags: [] })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ title: text, due_at: null, priority: 0, project: null, tags: [] })
  }
}
