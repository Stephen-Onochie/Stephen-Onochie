'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import IvenModule from '@/components/iven/IvenModule'
import { useIvenDarkMode } from '@/components/iven/IvenDarkModeContext'
import ClosetView from '@/components/stylemate/ClosetView'
import ItemDialog from '@/components/stylemate/ItemDialog'
import OutfitsView from '@/components/stylemate/OutfitsView'
import ScanDialog from '@/components/stylemate/ScanDialog'
import StyleMateNav from '@/components/stylemate/StyleMateNav'
import StylistView from '@/components/stylemate/StylistView'
import { Toast } from '@/components/stylemate/shared'
import { deleteItem, fetchItems, updateItem, withItemUrls } from '@/lib/stylemate/supabase'
import { createClient } from '@/lib/supabase/client'
import type { StyleMateTab, WardrobeItem, WardrobeItemView } from '@/types/stylemate'

const RENDER_CONCURRENCY = 2
const TABS: StyleMateTab[] = ['closet', 'outfits', 'stylist']

export default function StyleMatePage() {
  const supabase = useMemo(() => createClient(), [])
  const { dark } = useIvenDarkMode()

  const [tab, setTab] = useState<StyleMateTab>('closet')
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<WardrobeItemView[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [renderErrors, setRenderErrors] = useState<Record<string, string>>({})

  const renderQueue = useRef<string[]>([])
  const renderActive = useRef(0)
  const renderTried = useRef(new Set<string>())

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab') as StyleMateTab | null
    if (requested && TABS.includes(requested)) setTab(requested)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        setUserId(session.user.id)
        setItems(await fetchItems(supabase))
      } catch {
        setLoadError('Could not load your closet.')
      } finally {
        setLoading(false)
      }
    })()
  }, [supabase])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(id)
  }, [toast])

  const upsertItems = useCallback((next: WardrobeItemView[]) => {
    setItems(prev => {
      const byId = new Map(prev.map(i => [i.id, i]))
      next.forEach(i => byId.set(i.id, i))
      return Array.from(byId.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))
    })
  }, [])

  const renderItem = useCallback(async (id: string): Promise<void> => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, render_status: 'pending' } : i)))
    setRenderErrors(prev => {
      const { [id]: _cleared, ...rest } = prev
      return rest
    })
    try {
      const res = await fetch('/api/stylemate/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? 'Render failed')
      upsertItems(await withItemUrls(supabase, [payload.item as WardrobeItem]))
    } catch (err) {
      setItems(prev => prev.map(i => (i.id === id ? { ...i, render_status: 'failed' } : i)))
      setRenderErrors(prev => ({ ...prev, [id]: err instanceof Error ? err.message : 'Render failed' }))
    }
  }, [supabase, upsertItems])

  const pumpRenders = useCallback(() => {
    while (renderActive.current < RENDER_CONCURRENCY && renderQueue.current.length) {
      const id = renderQueue.current.shift()!
      renderActive.current++
      renderItem(id).finally(() => {
        renderActive.current--
        pumpRenders()
      })
    }
  }, [renderItem])

  // New scans and Gmail imports get a clean product render automatically, once.
  useEffect(() => {
    const fresh = items.filter(i => i.render_status === 'none' && !renderTried.current.has(i.id))
    if (fresh.length === 0) return
    fresh.forEach(i => {
      renderTried.current.add(i.id)
      renderQueue.current.push(i.id)
    })
    pumpRenders()
  }, [items, pumpRenders])

  const openItem = items.find(i => i.id === openItemId) ?? null

  async function saveItem(item: WardrobeItemView, patch: Partial<WardrobeItem>) {
    try {
      upsertItems([await updateItem(supabase, item.id, patch)])
      setOpenItemId(null)
    } catch {
      setToast('Could not save that item.')
    }
  }

  async function removeItem(item: WardrobeItemView) {
    try {
      await deleteItem(supabase, item, items)
      setItems(prev => prev.filter(i => i.id !== item.id))
      setOpenItemId(null)
    } catch {
      setToast('Could not delete that item.')
    }
  }

  async function approveItem(item: WardrobeItemView) {
    upsertItems([await updateItem(supabase, item.id, { is_incoming: false })])
    setOpenItemId(null)
    setToast(`${item.name} is in your closet.`)
  }

  const owned = items.filter(i => !i.is_incoming).length
  const incoming = items.length - owned

  return (
    <IvenModule
      index={6}
      title="StyleMate"
      right={
        <span className="font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
          {owned} PIECE{owned === 1 ? '' : 'S'}{incoming ? ` · ${incoming} INCOMING` : ''}
        </span>
      }
    >
      <StyleMateNav activeTab={tab} onTabChange={setTab} />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="rounded-2xl aspect-square animate-pulse" style={{ background: 'var(--iven-surface)' }} />)}
        </div>
      ) : loadError || !userId ? (
        <p className="font-inter text-sm text-center py-16" style={{ color: 'var(--iven-muted)' }}>{loadError ?? 'Sign in to see your closet.'}</p>
      ) : (
        <>
          {tab === 'closet' && <ClosetView items={items} onOpenItem={i => setOpenItemId(i.id)} onScan={() => setScanOpen(true)} />}
          {tab === 'outfits' && (
            <OutfitsView
              supabase={supabase}
              items={items}
              dark={dark}
              onItemsUpdated={upsertItems}
              onOpenItem={i => setOpenItemId(i.id)}
              notify={setToast}
            />
          )}
          {tab === 'stylist' && <StylistView supabase={supabase} userId={userId} items={items} onOpenItem={i => setOpenItemId(i.id)} />}

          <ScanDialog
            open={scanOpen}
            dark={dark}
            supabase={supabase}
            userId={userId}
            onClose={() => setScanOpen(false)}
            onItems={upsertItems}
          />
        </>
      )}

      <ItemDialog
        item={openItem}
        renderError={openItem ? renderErrors[openItem.id] ?? null : null}
        dark={dark}
        onClose={() => setOpenItemId(null)}
        onSave={saveItem}
        onDelete={removeItem}
        onApprove={approveItem}
        onRerender={item => renderItem(item.id)}
      />
      <Toast message={toast} />
    </IvenModule>
  )
}
