'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck, Check, Download, ImageIcon, LayoutGrid, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { SLOT_LABELS } from '@/lib/stylemate/constants'
import type { OutfitView, WardrobeItemView } from '@/types/stylemate'
import { ItemImage } from './shared'

export interface OutfitActions {
  generateImage: (outfit: OutfitView) => Promise<void>
  wear: (outfit: OutfitView) => Promise<void>
  toggleSave: (outfit: OutfitView) => Promise<void>
  remove: (outfit: OutfitView) => Promise<void>
  openItem: (item: WardrobeItemView) => void
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px] disabled:opacity-50"
      style={active ? { background: 'var(--iven-accent)', color: '#2C1F0E' } : { border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
    >
      {children}
    </button>
  )
}

export default function OutfitCard({
  outfit,
  items,
  actions,
}: {
  outfit: OutfitView
  items: Map<string, WardrobeItemView>
  actions: OutfitActions
}) {
  const [showLook, setShowLook] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState<'wear' | 'save' | null>(null)
  const pieces = outfit.item_ids.map(id => items.get(id)).filter((i): i is WardrobeItemView => !!i)
  const generating = outfit.image_status === 'pending'
  const lookVisible = showLook && !!outfit.image_url

  async function run(kind: 'wear' | 'save', action: () => Promise<void>) {
    setBusy(kind)
    try {
      await action()
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}>
      <div className="relative" style={{ background: '#F5F0E8' }}>
        {lookVisible ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={outfit.image_url!} alt={outfit.title} className="w-full aspect-[4/5] object-cover" />
        ) : (
          <div className={`grid gap-1 p-1 aspect-[4/5] ${pieces.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {pieces.map(p => (
              <button key={p.id} type="button" onClick={() => actions.openItem(p)} className="relative">
                <ItemImage item={p} className="w-full h-full rounded-lg" />
              </button>
            ))}
          </div>
        )}
        {generating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: 'rgba(20,16,12,0.55)', color: '#F5F0E8' }}>
            <Loader2 size={22} className="animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-[1.5px]">Styling the flat lay</span>
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[1.5px] font-semibold" style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}>
          {SLOT_LABELS[outfit.slot]}
        </span>
        {outfit.worn_on && (
          <span className="absolute top-2 right-2 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[1.5px]" style={{ background: 'rgba(20,16,12,0.75)', color: '#F5F0E8' }}>
            Worn {outfit.worn_on.slice(5)}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-playfair text-lg font-bold leading-tight" style={{ color: 'var(--iven-text)' }}>{outfit.title}</h3>
        {outfit.reasoning && <p className="font-inter text-[13px] leading-snug" style={{ color: 'var(--iven-text)' }}>{outfit.reasoning}</p>}
        {outfit.styling_tip && (
          <p className="font-inter text-[12px] leading-snug" style={{ color: 'var(--iven-muted)' }}>
            <span style={{ color: 'var(--iven-accent)' }}>Tip · </span>{outfit.styling_tip}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {pieces.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => actions.openItem(p)}
              className="flex items-center gap-1 rounded-full pl-1 pr-2 py-0.5 font-inter text-[11px]"
              style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color_hex ?? '#888' }} />
              {p.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-auto pt-3">
          {outfit.image_url ? (
            <>
              <IconButton label={lookVisible ? 'Show pieces' : 'Show look'} onClick={() => setShowLook(s => !s)}>
                {lookVisible ? <LayoutGrid size={13} /> : <ImageIcon size={13} />}
              </IconButton>
              <IconButton label="Regenerate look image" onClick={() => actions.generateImage(outfit)} disabled={generating}>
                <RefreshCw size={13} />
              </IconButton>
              <a
                href={outfit.image_url}
                target="_blank"
                rel="noreferrer"
                title="Open full image"
                aria-label="Open full image"
                className="h-8 px-2.5 rounded-lg flex items-center"
                style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
              >
                <Download size={13} />
              </a>
            </>
          ) : (
            <IconButton label="Generate look image" onClick={() => actions.generateImage(outfit)} disabled={generating}>
              <ImageIcon size={13} /> Look
            </IconButton>
          )}
          <IconButton label={outfit.worn_on ? 'Worn' : 'Wore it'} onClick={() => run('wear', () => actions.wear(outfit))} disabled={!!outfit.worn_on || busy !== null} active={!!outfit.worn_on}>
            {busy === 'wear' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {outfit.worn_on ? 'Worn' : 'Wore it'}
          </IconButton>
          <IconButton label={outfit.saved ? 'Saved' : 'Save'} onClick={() => run('save', () => actions.toggleSave(outfit))} disabled={busy !== null} active={outfit.saved}>
            {outfit.saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </IconButton>
          {confirmDelete ? (
            <IconButton label="Confirm delete" onClick={() => actions.remove(outfit)}>
              <Trash2 size={13} style={{ color: '#B4452F' }} /> Sure?
            </IconButton>
          ) : (
            <IconButton label="Delete outfit" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} />
            </IconButton>
          )}
        </div>
      </div>
    </article>
  )
}
