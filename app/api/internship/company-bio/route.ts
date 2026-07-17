import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Generates a short company bio + the skills they typically hire for, using
// OpenRouter with its web-search plugin so the summary reflects current info.
// User-triggered from the application detail modal; degrades to a 500 the UI
// surfaces rather than writing anything on failure.

export const dynamic = 'force-dynamic'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

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
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenRouter not configured' }, { status: 500 })
  }

  let body: { company?: string; role_title?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const company = body.company?.trim()
  if (!company) return NextResponse.json({ error: 'company is required' }, { status: 400 })
  const roleTitle = body.role_title?.trim()

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL
  const messages = [
    {
      role: 'system',
      content:
        `You research companies for a job seeker's application notes. Search the web for current, ` +
        `accurate information. Respond in plain text (no markdown code fences) using exactly this format:\n\n` +
        `**About ${company}**\n` +
        `<2-3 sentences: what the company does, its industry, size/stage, and anything notable>\n\n` +
        `**Skills they hire for**\n` +
        `<5-8 short bullet lines, each starting with "- ", covering the technologies, tools, and ` +
        `competencies this company typically looks for` +
        (roleTitle ? `, weighted toward a ${roleTitle} role` : '') +
        `>\n\n` +
        `Be specific and concise. If you can't verify something, omit it rather than guessing.`,
    },
    {
      role: 'user',
      content: roleTitle
        ? `Company: ${company}. Role I'm applying for: ${roleTitle}.`
        : `Company: ${company}.`,
    },
  ]

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        plugins: [{ id: 'web', max_results: 5 }],
        temperature: 0.3,
      }),
    })
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
    const json = await res.json()
    const notes = json.choices?.[0]?.message?.content?.trim()
    if (!notes) throw new Error('No summary returned')
    return NextResponse.json({ notes })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bio generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
