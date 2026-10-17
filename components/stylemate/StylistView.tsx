'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react'
import { deleteThread, fetchThreads, saveThread } from '@/lib/stylemate/supabase'
import type { StylistMessage, StylistThread, WardrobeItemView } from '@/types/stylemate'
import { ItemImage, inputStyle } from './shared'

const STARTERS = [
  'What should I buy next for fall and winter?',
  'What gaps does my closet have?',
  'Give me 3 fits for a party this weekend',
  "What's trending in menswear right now?",
  'Which of my pieces are the most versatile?',
]

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}

function ItemTag({ item, onOpen }: { item: WardrobeItemView; onOpen: (item: WardrobeItemView) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="inline-flex items-center gap-1.5 align-middle rounded-full pl-0.5 pr-2 py-0.5 mx-0.5 font-inter text-[12px]"
      style={{ border: '1px solid var(--iven-border)', background: 'var(--iven-bg)', color: 'var(--iven-text)' }}
    >
      <ItemImage item={item} className="w-5 h-5 rounded-full" />
      {item.name}
    </button>
  )
}

function RichLine({ line, items, onOpen }: { line: string; items: Map<string, WardrobeItemView>; onOpen: (item: WardrobeItemView) => void }) {
  const segments = line.split(/(\[\[item:[a-z0-9-]+\]\])/gi)
  return (
    <>
      {segments.map((seg, i) => {
        const match = seg.match(/^\[\[item:([a-z0-9-]+)\]\]$/i)
        if (match) {
          const item = items.get(match[1].toLowerCase().slice(0, 8))
          return item ? <ItemTag key={i} item={item} onOpen={onOpen} /> : null
        }
        return <InlineText key={i} text={seg} />
      })}
    </>
  )
}

function MessageBody({ text, items, onOpen }: { text: string; items: Map<string, WardrobeItemView>; onOpen: (item: WardrobeItemView) => void }) {
  const lines = text.split('\n')
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((raw, i) => {
        const line = raw.trimEnd()
        if (!line.trim()) return null
        const heading = line.match(/^#{1,4}\s+(.*)$/)
        if (heading) {
          return <p key={i} className="font-playfair font-bold text-[15px] mt-1"><RichLine line={heading[1]} items={items} onOpen={onOpen} /></p>
        }
        const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/)
        if (bullet) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span style={{ color: 'var(--iven-accent)' }}>•</span>
              <span className="flex-1"><RichLine line={bullet[1]} items={items} onOpen={onOpen} /></span>
            </div>
          )
        }
        return <p key={i}><RichLine line={line} items={items} onOpen={onOpen} /></p>
      })}
    </div>
  )
}

export default function StylistView({
  supabase,
  userId,
  items,
  onOpenItem,
}: {
  supabase: SupabaseClient
  userId: string
  items: WardrobeItemView[]
  onOpenItem: (item: WardrobeItemView) => void
}) {
  const [threads, setThreads] = useState<StylistThread[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<StylistMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const itemsByRef = useMemo(() => new Map(items.map(i => [i.id.slice(0, 8), i])), [items])

  useEffect(() => {
    fetchThreads(supabase).then(setThreads).catch(() => {})
  }, [supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  function openThread(thread: StylistThread) {
    if (streaming) return
    setThreadId(thread.id)
    setMessages(thread.messages)
  }

  function newChat() {
    if (streaming) return
    setThreadId(null)
    setMessages([])
  }

  async function removeThread(id: string) {
    await deleteThread(supabase, id)
    setThreads(prev => prev.filter(t => t.id !== id))
    if (threadId === id) newChat()
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || streaming) return
    const history: StylistMessage[] = [...messages, { role: 'user', text: content }]
    setMessages([...history, { role: 'assistant', text: '' }])
    setInput('')
    setStreaming(true)

    let reply = ''
    try {
      const res = await fetch('/api/stylemate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error ?? `Stylist unavailable (${res.status})`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        reply += decoder.decode(value, { stream: true })
        setMessages([...history, { role: 'assistant', text: reply }])
      }
    } catch (err) {
      reply = reply || `_${err instanceof Error ? err.message : 'Stylist unavailable'}_`
      setMessages([...history, { role: 'assistant', text: reply }])
    } finally {
      setStreaming(false)
    }

    const finalMessages: StylistMessage[] = [...history, { role: 'assistant', text: reply }]
    try {
      const saved = await saveThread(supabase, userId, {
        id: threadId,
        title: threadId ? threads.find(t => t.id === threadId)?.title ?? content.slice(0, 60) : content.slice(0, 60),
        messages: finalMessages,
      })
      setThreadId(saved.id)
      setThreads(prev => [saved, ...prev.filter(t => t.id !== saved.id)])
    } catch {
      // The conversation stays on screen even if persisting it fails.
    }
  }

  return (
    <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-5">
      <aside className="hidden lg:flex flex-col gap-1">
        <button
          type="button"
          onClick={newChat}
          className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[1.5px] mb-2"
          style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
        >
          <Plus size={13} /> New chat
        </button>
        {threads.map(t => (
          <div key={t.id} className="group flex items-center rounded-lg" style={t.id === threadId ? { background: 'var(--iven-surface)' } : undefined}>
            <button type="button" onClick={() => openThread(t)} className="flex-1 text-left px-3 py-2 font-inter text-[13px] truncate" style={{ color: 'var(--iven-text)' }}>
              {t.title}
            </button>
            <button type="button" onClick={() => removeThread(t.id)} aria-label="Delete chat" className="px-2 opacity-0 group-hover:opacity-100" style={{ color: 'var(--iven-muted)' }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </aside>

      <div className="flex flex-col rounded-2xl min-h-[60vh]" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}>
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto max-h-[68vh]">
          {messages.length === 0 ? (
            <div className="m-auto text-center max-w-md">
              <p className="font-playfair text-2xl font-bold mb-2" style={{ color: 'var(--iven-text)' }}>Ask your stylist</p>
              <p className="font-inter text-sm mb-5" style={{ color: 'var(--iven-muted)' }}>
                Knows every piece in your closet, your planned fits and the forecast, and can search the web for trends and drops.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map(s => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full px-3 py-1.5 font-inter text-[12px]" style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[88%] rounded-2xl px-4 py-3 font-inter text-[14px] leading-relaxed"
                  style={m.role === 'user' ? { background: 'var(--iven-accent)', color: '#2C1F0E' } : { background: 'var(--iven-bg)', color: 'var(--iven-text)' }}
                >
                  {m.role === 'assistant' && !m.text && streaming ? (
                    <span className="inline-flex items-center gap-2" style={{ color: 'var(--iven-muted)' }}>
                      <Loader2 size={14} className="animate-spin" /> Thinking
                    </span>
                  ) : m.role === 'assistant' ? (
                    <MessageBody text={m.text} items={itemsByRef} onOpen={onOpenItem} />
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={e => { e.preventDefault(); send(input) }}
          className="p-3 flex gap-2 items-end border-t"
          style={{ borderColor: 'var(--iven-grid)' }}
        >
          <button type="button" onClick={newChat} className="lg:hidden h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-muted)' }} aria-label="New chat">
            <Plus size={16} />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            rows={1}
            placeholder="Ask about fits, what to buy, trends…"
            className="flex-1 font-inter text-sm rounded-xl px-3 py-2.5 outline-none resize-none max-h-40"
            style={inputStyle()}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
            style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}
            aria-label="Send"
          >
            {streaming ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
