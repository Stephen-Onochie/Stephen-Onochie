'use client'

import { useState } from 'react'
import { Sparkles, ArrowUp } from 'lucide-react'

const SUGGESTIONS = [
  'Am I at risk for knee injury?',
  'How has my recovery trended this month?',
  'Is my sleep affecting my resting heart rate?',
]

export default function HealthAskPanel() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function ask(q: string) {
    const trimmed = q.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError('')
    setAnswer('')
    try {
      const res = await fetch('/api/health-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setAnswer(data.answer || 'No answer returned.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={15} style={{ color: 'var(--iven-accent)' }} />
        <span className="font-mono text-[10px] font-semibold tracking-[2.6px] uppercase" style={{ color: 'var(--iven-muted)' }}>
          Ask Your Data
        </span>
      </div>

      <div className="relative">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(question)}
          placeholder="Ask anything about your health data…"
          className="w-full rounded-xl pl-4 pr-12 py-3 font-inter text-sm outline-none"
          style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
        />
        <button
          onClick={() => ask(question)}
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition-opacity disabled:opacity-40"
          style={{ background: 'var(--iven-accent)', color: 'var(--iven-bg)' }}
        >
          <ArrowUp size={15} />
        </button>
      </div>

      {!answer && !loading && !error && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => {
                setQuestion(s)
                ask(s)
              }}
              className="font-mono text-[10px] tracking-[0.5px] px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--iven-border)', color: 'var(--iven-muted)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="font-mono text-xs animate-pulse" style={{ color: 'var(--iven-muted)' }}>
          Analyzing your metrics…
        </div>
      )}

      {error && (
        <div className="font-mono text-xs" style={{ color: '#B5532E' }}>
          {error}
        </div>
      )}

      {answer && (
        <div
          className="font-inter text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-4"
          style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
        >
          {answer}
        </div>
      )}
    </div>
  )
}
