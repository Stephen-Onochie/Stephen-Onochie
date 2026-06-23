import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  let body: { bookId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const bookId = body.bookId?.trim()
  if (!bookId) return NextResponse.json({ error: 'bookId is required' }, { status: 400 })

  // RLS scopes both queries to the signed-in user.
  const { data: book } = await supabase
    .from('reading_books')
    .select('title, author')
    .eq('id', bookId)
    .maybeSingle()
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const { data: sessions } = await supabase
    .from('reading_sessions')
    .select('session_date, notes, start_page, end_page')
    .eq('book_id', bookId)
    .not('notes', 'is', null)
    .order('started_at', { ascending: true })

  const notes = (sessions ?? []).filter(s => s.notes && s.notes.trim())
  if (!notes.length) {
    return NextResponse.json({ error: 'No notes to reflect on yet.' }, { status: 400 })
  }

  const notesBlock = notes
    .map(s => {
      const pages =
        s.start_page != null && s.end_page != null ? ` (pp. ${s.start_page}–${s.end_page})` : ''
      return `[${s.session_date}${pages}] ${s.notes!.trim()}`
    })
    .join('\n\n')

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL
  const messages = [
    {
      role: 'system',
      content:
        `You are a thoughtful reading companion. The user keeps short notes after each reading ` +
        `session. Weave their notes for one book into a single polished reflection document — ` +
        `flowing prose with light structure (you may use short headers). Surface the interesting ` +
        `stories, facts, and ideas they noted, group related thoughts, and preserve their voice. ` +
        `Do not invent content beyond their notes. Use Markdown.`,
    },
    {
      role: 'user',
      content: `Book: "${book.title}"${book.author ? ` by ${book.author}` : ''}\n\nMy session notes:\n\n${notesBlock}`,
    },
  ]

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.6 }),
    })
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
    const completion = await res.json()
    const reflection = completion.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ reflection })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reflection failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
