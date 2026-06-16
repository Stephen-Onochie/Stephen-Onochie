'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bubble, BubbleType } from '@/types/bubbles'
import BubbleCard from '@/components/bubbles/BubbleCard'
import BubbleForm from '@/components/bubbles/BubbleForm'
import IvenModule from '@/components/iven/IvenModule'
import * as Dialog from '@radix-ui/react-dialog'

type TabId = 'active' | 'saved' | 'graveyard'

const TABS: { id: TabId; label: string }[] = [
  { id: 'active', label: 'ACTIVE' },
  { id: 'saved', label: 'SAVED' },
  { id: 'graveyard', label: 'EXPIRED' },
]

function getTabBubbles(bubbles: Bubble[], tab: TabId): Bubble[] {
  const now = new Date().toISOString()
  switch (tab) {
    case 'active':
      return bubbles.filter((b) => !b.saved && b.expires_at > now)
    case 'saved':
      return bubbles.filter((b) => b.saved)
    case 'graveyard':
      return bubbles.filter((b) => !b.saved && b.expires_at <= now)
  }
}

export default function BubblesPage() {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [tab, setTab] = useState<TabId>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchBubbles = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('bubbles')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setBubbles(data ?? [])
    } catch {
      setError('Failed to load bubbles. Is Supabase configured?')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchBubbles() }, [fetchBubbles])

  async function handleCreate(data: { title: string; body: string; type: BubbleType; expiryHours: number }) {
    const expiresAt = new Date(Date.now() + data.expiryHours * 60 * 60 * 1000).toISOString()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error: err } = await supabase.from('bubbles').insert({
      title: data.title,
      body: data.body || null,
      type: data.type,
      expires_at: expiresAt,
      saved: false,
      user_id: session.user.id,
    })
    if (!err) {
      setModalOpen(false)
      await fetchBubbles()
    }
  }

  async function handleSave(id: string) {
    await supabase.from('bubbles').update({ saved: true }).eq('id', id)
    await fetchBubbles()
  }
  async function handleUnsave(id: string) {
    await supabase.from('bubbles').update({ saved: false }).eq('id', id)
    await fetchBubbles()
  }
  async function handleDelete(id: string) {
    await supabase.from('bubbles').delete().eq('id', id)
    setBubbles((prev) => prev.filter((b) => b.id !== id))
  }
  async function handleRescue(id: string) {
    const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    await supabase.from('bubbles').update({ expires_at: newExpiry }).eq('id', id)
    await fetchBubbles()
  }

  const visibleBubbles = getTabBubbles(bubbles, tab)

  return (
    <IvenModule
      index={7}
      title="Bubbles"
      right={
        <span className="font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
          {visibleBubbles.length} {tab === 'active' ? 'ACTIVE' : tab === 'saved' ? 'SAVED' : 'EXPIRED'}
        </span>
      }
    >
      {/* Tab bar */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid var(--iven-grid)', paddingBottom: 12 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="font-mono text-[10px] tracking-[1.5px] px-3 py-[6px] rounded-lg transition-colors"
            style={{
              background: tab === t.id ? 'var(--iven-accent)' : 'transparent',
              color: tab === t.id ? '#2C1F0E' : 'var(--iven-muted)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse h-32" style={{ background: 'var(--iven-surface)' }} />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-16">
          <p className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>{error}</p>
        </div>
      )}

      {!loading && !error && visibleBubbles.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">{tab === 'active' ? '💭' : tab === 'saved' ? '⭐' : '👻'}</p>
          <p className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>
            {tab === 'active' && 'No active bubbles. Drop one below!'}
            {tab === 'saved' && 'Nothing saved yet.'}
            {tab === 'graveyard' && 'No expired bubbles.'}
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {visibleBubbles.map((bubble) => (
            <BubbleCard
              key={bubble.id}
              bubble={bubble}
              view={tab}
              onSave={handleSave}
              onDelete={handleDelete}
              onUnsave={handleUnsave}
              onRescue={handleRescue}
            />
          ))}
        </div>
      )}

      {/* FAB + Modal */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Trigger asChild>
          <button
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors z-50"
            style={{ background: 'var(--iven-accent)', color: '#2C1F0E', border: 'none', cursor: 'pointer' }}
          >
            +
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content
            className="fixed bottom-0 left-[70px] right-0 rounded-t-3xl p-6 z-50 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--iven-bg)' }}
          >
            <Dialog.Title className="font-playfair text-2xl font-bold mb-6" style={{ color: 'var(--iven-text)' }}>
              New Bubble
            </Dialog.Title>
            <BubbleForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </IvenModule>
  )
}
