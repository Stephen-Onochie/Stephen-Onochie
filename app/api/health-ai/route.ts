import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchDailySeries } from '@/lib/health/aggregate'
import { getMetricDef } from '@/lib/health/metrics'
import type { DateRange } from '@/types/health'

export const dynamic = 'force-dynamic'

const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const MAX_TOOL_ROUNDS = 5

// Tool the model calls to pull aggregated data for a metric it cares about.
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_metric',
      description:
        'Fetch the daily-aggregated values for one health metric over a date range. Returns an array of {date, value}.',
      parameters: {
        type: 'object',
        properties: {
          metric_type: {
            type: 'string',
            description: 'Normalized metric type, e.g. steps, resting_heart_rate, hrv, sleep_duration, weight, spo2.',
          },
          range: {
            type: 'string',
            enum: ['7d', '30d', '90d', 'all'],
            description: 'How far back to aggregate. Default 90d.',
          },
        },
        required: ['metric_type'],
      },
    },
  },
]

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

  let body: { question?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const question = body.question?.trim()
  if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 })

  // Give the model the menu of metrics the user actually has data for.
  const { data: typeRows } = await supabase.from('health_metrics').select('metric_type')
  const availableTypes = Array.from(new Set((typeRows ?? []).map(r => r.metric_type as string)))
  const menu = availableTypes.map(t => `${t} (${getMetricDef(t).label}, ${getMetricDef(t).unit})`).join(', ')

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL
  const messages: any[] = [
    {
      role: 'system',
      content:
        `You are a health-data analyst answering questions about the user's own wearable data. ` +
        `Available metrics: ${menu || 'none'}. ` +
        `Call get_metric to pull the data you need before answering. Pull several relevant metrics for ` +
        `open-ended questions. Be concrete: cite trends, averages, and recent changes from the data. ` +
        `If the data can't support an answer, say so plainly.`,
    },
    { role: 'user', content: question },
  ]

  async function callModel(msgs: any[]) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: msgs, tools: TOOLS, temperature: 0.4 }),
    })
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
    return res.json()
  }

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await callModel(messages)
      const msg = completion.choices?.[0]?.message
      if (!msg) throw new Error('No completion returned')
      messages.push(msg)

      const toolCalls = msg.tool_calls
      if (!toolCalls?.length) {
        return NextResponse.json({ answer: msg.content ?? '' })
      }

      for (const call of toolCalls) {
        let result: unknown = { error: 'unknown tool' }
        if (call.function?.name === 'get_metric') {
          try {
            const args = JSON.parse(call.function.arguments || '{}')
            const range: DateRange = ['7d', '30d', '90d', 'all'].includes(args.range) ? args.range : '90d'
            const series = await fetchDailySeries(supabase, args.metric_type, range)
            result = { metric_type: args.metric_type, range, series }
          } catch (e) {
            result = { error: e instanceof Error ? e.message : 'failed' }
          }
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }
    }
    // Ran out of tool rounds — ask for a final answer with no more tools.
    const final = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.4 }),
    }).then(r => r.json())
    return NextResponse.json({ answer: final.choices?.[0]?.message?.content ?? '' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Q&A failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
