'use client'

import { useCallback, useEffect, useState } from 'react'
import AppHeader from '@/components/apps/AppHeader'
import AddItemFlow from '@/components/stylemate/AddItemFlow'
import ClosetGrid from '@/components/stylemate/ClosetGrid'
import ItemDetailSheet from '@/components/stylemate/ItemDetailSheet'
import LaundryWarning from '@/components/stylemate/LaundryWarning'
import StyleMateNav from '@/components/stylemate/StyleMateNav'
import type { TagEditorValues } from '@/components/stylemate/TagEditor'
import {
  approveIncomingItem,
  createWardrobeItem,
  deleteWardrobeItem,
  fetchWardrobeItems,
  updateWardrobeItem,
  uploadWardrobeImage,
} from '@/lib/stylemate/supabase'
import { createClient } from '@/lib/supabase/client'
import type {
  ApparelCategory,
  LaundryStatus,
  StyleMateTab,
  WardrobeItemWithSignedUrl,
} from '@/types/stylemate'

function IncomingTab({
  items,
  onApprove,
}: {
  items: WardrobeItemWithSignedUrl[]
  onApprove: (id: string) => Promise<void>
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-4xl mb-3">📦</p>
        <p className="text-textMuted font-inter text-sm">
          No incoming items. Gmail purchase detection arrives in a future update.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      {items.map((item) => (
        <IncomingRow key={item.id} item={item} onApprove={onApprove} />
      ))}
    </div>
  )
}

function IncomingRow({
  item,
  onApprove,
}: {
  item: WardrobeItemWithSignedUrl
  onApprove: (id: string) => Promise<void>
}) {
  return (
    <div className="flex items-center gap-4 bg-surface border border-goldLight rounded-2xl p-4">
      {item.signed_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.signed_image_url}
          alt={item.name}
          className="w-16 h-16 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-beige flex items-center justify-center text-2xl shrink-0">
          👕
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-playfair font-bold text-textPrimary truncate">{item.name}</p>
        <p className="font-inter text-xs text-textMuted capitalize mt-0.5">{item.category}</p>
        <button
          type="button"
          onClick={() => onApprove(item.id)}
          className="mt-2 text-xs font-inter font-semibold text-gold hover:text-brownAccent"
        >
          Approve into closet
        </button>
      </div>
    </div>
  )
}

export default function StyleMatePage() {
  const [tab, setTab] = useState<StyleMateTab>('closet')
  const [items, setItems] = useState<WardrobeItemWithSignedUrl[]>([])
  const [incomingItems, setIncomingItems] = useState<WardrobeItemWithSignedUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<WardrobeItemWithSignedUrl | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const supabase = createClient()

  const loadItems = useCallback(async () => {
    try {
      const [closet, incoming] = await Promise.all([
        fetchWardrobeItems(supabase),
        fetchWardrobeItems(supabase, { incomingOnly: true }),
      ])
      setItems(closet)
      setIncomingItems(incoming)
      setError(null)
    } catch {
      setError('Failed to load wardrobe. Is Supabase configured?')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  async function handleAddItem(file: File, values: TagEditorValues) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in')

    const item = await createWardrobeItem(supabase, session.user.id, {
      name: values.name,
      category: values.category,
      sub_type: values.sub_type || null,
      color: values.color,
      min_temp_threshold: values.min_temp_threshold,
      max_temp_threshold: values.max_temp_threshold,
      archetype: values.archetype,
      status: values.status,
    })

    const imagePath = await uploadWardrobeImage(supabase, session.user.id, item.id, file)
    await updateWardrobeItem(supabase, item.id, { image_url: imagePath })

    await loadItems()
    setTab('closet')
  }

  async function handleStatusChange(id: string, status: LaundryStatus) {
    await updateWardrobeItem(supabase, id, { status })
    await loadItems()
  }

  async function handleItemSave(
    id: string,
    patch: {
      name: string
      category: ApparelCategory
      sub_type: string | null
      color: string
      min_temp_threshold: number
      max_temp_threshold: number
      archetype: string
      status: LaundryStatus
    }
  ) {
    await updateWardrobeItem(supabase, id, patch)
    await loadItems()
  }

  async function handleItemDelete(id: string, imagePath: string | null) {
    await deleteWardrobeItem(supabase, id, imagePath)
    await loadItems()
  }

  async function handleApproveIncoming(id: string) {
    await approveIncomingItem(supabase, id)
    await loadItems()
  }

  function handleItemClick(item: WardrobeItemWithSignedUrl) {
    setSelectedItem(item)
    setDetailOpen(true)
  }

  const headerRight =
    tab === 'closet'
      ? `${items.length} item${items.length === 1 ? '' : 's'}`
      : tab === 'incoming'
        ? `${incomingItems.length} pending`
        : undefined

  return (
    <main className="min-h-screen bg-beige pb-24">
      <AppHeader
        title="StyleMate"
        right={
          headerRight ? (
            <span className="text-textMuted text-sm font-inter">{headerRight}</span>
          ) : undefined
        }
      />

      {loading && (
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface rounded-2xl aspect-[3/4] animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-16 px-4">
          <p className="text-textMuted font-inter text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && tab === 'closet' && (
        <>
          <LaundryWarning items={items} />
          <ClosetGrid
            items={items}
            onStatusChange={handleStatusChange}
            onItemClick={handleItemClick}
          />
        </>
      )}

      {!loading && !error && tab === 'add' && <AddItemFlow onSave={handleAddItem} />}

      {!loading && !error && tab === 'incoming' && (
        <IncomingTab items={incomingItems} onApprove={handleApproveIncoming} />
      )}

      <ItemDetailSheet
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSave={handleItemSave}
        onDelete={handleItemDelete}
      />

      <StyleMateNav activeTab={tab} onTabChange={setTab} />
    </main>
  )
}
