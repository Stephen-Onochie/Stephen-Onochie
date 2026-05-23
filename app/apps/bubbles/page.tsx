'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bubble, BubbleType } from '@/types/bubbles'
import BubbleCard from '@/components/bubbles/BubbleCard'
import BubbleForm from '@/components/bubbles/BubbleForm'
import BottomNav from '@/components/apps/BottomNav'
import * as Dialog from '@radix-ui/react-dialog'

type TabId = 'active' | 'saved' | 'graveyard'

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
    } catch (e) {
      setError('Failed to load bubbles. Is Supabase configured?')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchBubbles()
  }, [fetchBubbles])

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
    <main className="min-h-screen bg-beige pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-beige border-b border-goldLight px-6 py-4 flex items-center justify-between z-40">
        <h1 className="font-playfair text-2xl font-bold text-textPrimary">Bubbles</h1>
        <span className="text-textMuted text-sm font-inter">
          {tab === 'active' && `${visibleBubbles.length} active`}
          {tab === 'saved' && `${visibleBubbles.length} saved`}
          {tab === 'graveyard' && `${visibleBubbles.length} expired`}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-5 animate-pulse h-32" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-textMuted font-inter text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && visibleBubbles.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">
              {tab === 'active' ? '💭' : tab === 'saved' ? '⭐' : '👻'}
            </p>
            <p className="text-textMuted font-inter text-sm">
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
      </div>

      {/* FAB */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Trigger asChild>
          <button className="fixed bottom-20 right-5 w-14 h-14 bg-gold text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-brownAccent transition-colors z-50">
            +
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed bottom-0 left-0 right-0 bg-beige rounded-t-3xl p-6 z-50 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="font-playfair text-2xl font-bold text-textPrimary mb-6">
              New Bubble
            </Dialog.Title>
            <BubbleForm
              onSubmit={handleCreate}
              onCancel={() => setModalOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <BottomNav activeTab={tab} onTabChange={(t) => setTab(t as TabId)} />
    </main>
  )
}
