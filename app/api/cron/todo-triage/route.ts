import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todoUserId } from '@/lib/todo/admin'
import type { Todo, TodoList, TriageSuggestion } from '@/types/todo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

// Nightly inbox auto-triage. Reads untriaged inbox tasks and asks the model to
// suggest a project + priority + due date. Suggestions are STAGED into
// todos.triage_suggestion — never auto-applied. The user accepts per-item in the
// UI. Triggered by Vercel Cron (Authorization: Bearer <CRON_SECRET>).
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OpenRouter not configured' }, { status: 500 })

  const db = createAdminClient()
  const userId = todoUserId()

  const { data: projectRows } = await db
    .from('todo_lists')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order')
  const projects = (projectRows as TodoList[]) ?? []

  // Fresh inbox items: no project, no priority, not completed, not yet triaged.
  const { data: taskRows } = await db
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .is('list_id', null)
    .eq('completed', false)
    .eq('priority', 0)
    .is('triage_suggestion', null)
    .order('created_at', { ascending: false })
    .limit(25)
  const tasks = (taskRows as Todo[]) ?? []
  if (!tasks.length) return NextResponse.json({ triaged: 0, reason: 'no untriaged inbox items' })

  const model = process.env.TODO_TRIAGE_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_MODEL
  const projectList = projects.map(p => `${p.name} (id: ${p.id})`).join(', ')

  const system =
    `You triage a personal inbox. For each task suggest the best project, a priority ` +
    `(1=highest … 3, or 0 if unclear), and a due date if the task implies one. ` +
    `Respond with STRICT JSON only, no fences: {"suggestions":[{"task_id":string,"project_id":string|null,"priority":0|1|2|3,"due_at":string|null}]}. ` +
    `Projects: ${projectList || '(none)'}. Now is ${new Date().toISOString()}.`
  const userMsg = JSON.stringify(tasks.map(t => ({ task_id: t.id, title: t.title, notes: t.notes })))

  let suggestions: { task_id: string; project_id: string | null; priority: number; due_at: string | null }[] = []
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        temperature: 0,
      }),
    })
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
    const json = await res.json()
    const raw = String(json.choices?.[0]?.message?.content ?? '')
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'triage failed' }, { status: 502 })
  }

  const validProjectIds = new Set(projects.map(p => p.id))
  let triaged = 0
  for (const s of suggestions) {
    const task = tasks.find(t => t.id === s.task_id)
    if (!task) continue
    const suggestion: TriageSuggestion = {
      project_id: s.project_id && validProjectIds.has(s.project_id) ? s.project_id : null,
      priority: typeof s.priority === 'number' && s.priority >= 0 && s.priority <= 3 ? s.priority : 0,
      due_at: s.due_at ?? null,
    }
    await db.from('todos').update({ triage_suggestion: suggestion }).eq('id', task.id).eq('user_id', userId)
    triaged++
  }

  return NextResponse.json({ triaged })
}
