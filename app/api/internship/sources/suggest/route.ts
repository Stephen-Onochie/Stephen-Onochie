import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Suggests companies (and search terms) for a focus area the owner is
// exploring, via OpenRouter with web search so the list reflects who is
// actually hiring interns now. Suggestions are only shown; nothing is saved
// until the owner adds one.

export const dynamic = 'force-dynamic'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

interface Suggestion {
  company: string
  why: string
  careers_url: string | null
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

  let body: { name?: string; description?: string; search_terms?: string[]; existing?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const existing = (body.existing ?? []).slice(0, 60)

  const system =
    `You help a Purdue computer engineering sophomore (Indianapolis area, open to relocating) find ` +
    `Summer 2027 internships in a field they're exploring. Search the web for companies that hire ` +
    `engineering/software/hardware interns in this field. Mix established companies and startups; ` +
    `favor ones with a US presence, and include Indiana/Midwest employers when they exist. ` +
    `Respond with ONLY a JSON object, no code fences:\n` +
    `{"companies":[{"company":"<name>","why":"<one short sentence: what they do + the intern work>",` +
    `"careers_url":"<careers or job board URL, or null>"}],"search_terms":["<2-4 extra job-search keywords>"]}\n` +
    `Return 8-10 companies. Skip any company in the exclude list. Never invent a URL; use null when unsure.`

  const user_msg =
    `Field: ${name}.` +
    (body.description ? ` Notes: ${body.description}.` : '') +
    (body.search_terms?.length ? ` Current search terms: ${body.search_terms.join(', ')}.` : '') +
    (existing.length ? ` Exclude: ${existing.join(', ')}.` : '')

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user_msg },
        ],
        plugins: [{ id: 'web', max_results: 8 }],
        temperature: 0.3,
      }),
    })
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
    const json = await res.json()
    const content: string = json.choices?.[0]?.message?.content ?? ''
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No suggestions returned')
    const parsed = JSON.parse(match[0]) as { companies?: Partial<Suggestion>[]; search_terms?: unknown[] }
    const exclude = new Set(existing.map(e => e.toLowerCase()))
    const companies: Suggestion[] = (parsed.companies ?? [])
      .filter(c => typeof c.company === 'string' && c.company.trim() && !exclude.has(c.company.trim().toLowerCase()))
      .map(c => ({
        company: c.company!.trim(),
        why: typeof c.why === 'string' ? c.why.trim() : '',
        careers_url: typeof c.careers_url === 'string' && /^https?:\/\//.test(c.careers_url) ? c.careers_url : null,
      }))
    const search_terms = (parsed.search_terms ?? []).filter((t): t is string => typeof t === 'string' && !!t.trim())
    return NextResponse.json({ companies, search_terms })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Suggestion failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
