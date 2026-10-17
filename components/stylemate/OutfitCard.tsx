'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck, CalendarDays, Check, Download, ImageIcon, LayoutGrid, Library, Loader2, Pencil, PersonStanding, RefreshCw, Trash2 } from 'lucide-react'
import { addDaysToDateStr, todayEastern } from '@/lib/dates'
import { SLOT_LABELS } from '@/lib/stylemate/constants'
import type { OutfitImageKind, OutfitView, WardrobeItemView } from '@/types/stylemate'
import { ItemImage } from './shared'

export interface OutfitActions {
  generateImage: (outfit: OutfitView, kind: OutfitImageKind) => Promise<void>
  wear: (outfit: OutfitView) => Promise<void>
  toggleSave: (outfit: OutfitView) => Promise<void>
  remove: (outfit: OutfitView) => Promise<void>
  move: (outfit: OutfitView, date: string | null) => Promise<void>
  edit: (outfit: OutfitView) => void
  openItem: (item: WardrobeItemView) => void
}

const MOVE_DAYS = 14

export function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function MoveMenu({ outfit, onPick, onClose }: { outfit: OutfitView; onPick: (date: string | null) => void; onClose: () => void }) {
  const today = todayEastern()
  const days = Array.from({ length: MOVE_DAYS }, (_, i) => addDaysToDateStr(today, i))
  return (
    <>
      <button type="button" aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={onClose} />
      <div
        className="absolute bottom-full left-0 mb-2 z-20 w-64 rounded-xl p-2 shadow-lg"
        style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)' }}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => onPick(null)}
          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 font-inter text-[13px] text-left"
          style={outfit.plan_date === null ? { background: 'var(--iven-accent)', color: '#2C1F0E' } : { color: 'var(--iven-text)' }}
        >
          <Library size={13} /> Library only (no day)
        </button>
        <div className="grid grid-cols-2 gap-1 mt-1">
          {days.map(d => (
            <button
              key={d}
              type="button"
              role="menuitem"
              onClick={() => onPick(d)}
              className="rounded-lg px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.5px] text-left"
              style={outfit.plan_date === d ? { background: 'var(--iven-accent)', color: '#2C1F0E' } : { color: 'var(--iven-text)', border: '1px solid var(--iven-grid)' }}
            >
              {d === today ? 'Today' : shortDate(d)}
            </button>
          ))}
        </div>
      </div>
    </>
  )
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
  showDate = false,
}: {
  outfit: OutfitView
  items: Map<string, WardrobeItemView>
  actions: OutfitActions
  showDate?: boolean
}) {
  const [view, setView] = useState<OutfitImageKind | 'pieces' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState<'wear' | 'save' | 'move' | null>(null)
  const [moving, setMoving] = useState(false)
  const pieces = outfit.item_ids.map(id => items.get(id)).filter((i): i is WardrobeItemView => !!i)

  const urls: Record<OutfitImageKind, string | null> = { flatlay: outfit.image_url, model: outfit.model_image_url }
  const pending: Record<OutfitImageKind, boolean> = {
    flatlay: outfit.image_status === 'pending',
    model: outfit.model_image_status === 'pending',
  }
  // Until the user picks a view, show the newest available image, then the pieces grid.
  const shown: OutfitImageKind | 'pieces' = view ?? (urls.model ? 'model' : urls.flatlay ? 'flatlay' : 'pieces')
  const shownUrl = shown === 'pieces' ? null : urls[shown]
  const generatingShown = shown !== 'pieces' && pending[shown]

  function showOrGenerate(kind: OutfitImageKind) {
    setView(kind)
    if (!urls[kind] && !pending[kind]) actions.generateImage(outfit, kind)
  }

  async function run(kind: 'wear' | 'save' | 'move', action: () => Promise<void>) {
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
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownUrl} alt={`${outfit.title} ${shown === 'model' ? 'on a mannequin' : 'flat lay'}`} className="w-full aspect-[4/5] object-cover" />
        ) : (
          <div className={`grid gap-1 p-1 aspect-[4/5] ${pieces.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {pieces.map(p => (
              <button key={p.id} type="button" onClick={() => actions.openItem(p)} className="relative">
                <ItemImage item={p} className="w-full h-full rounded-lg" />
              </button>
            ))}
          </div>
        )}
        {generatingShown && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: 'rgba(20,16,12,0.55)', color: '#F5F0E8' }}>
            <Loader2 size={22} className="animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-[1.5px]">{shown === 'model' ? 'Dressing the mannequin' : 'Styling the flat lay'}</span>
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[1.5px] font-semibold" style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}>
          {SLOT_LABELS[outfit.slot]}
        </span>
        {showDate && (
          <span className="absolute bottom-2 left-2 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[1.5px]" style={{ background: 'rgba(20,16,12,0.75)', color: '#F5F0E8' }}>
            {outfit.plan_date ? shortDate(outfit.plan_date) : 'No day'}
          </span>
        )}
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
          <IconButton label="Flat lay image" onClick={() => showOrGenerate('flatlay')} active={shown === 'flatlay'}>
            {pending.flatlay ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Look
          </IconButton>
          <IconButton label="Outfit on a mannequin" onClick={() => showOrGenerate('model')} active={shown === 'model'}>
            {pending.model ? <Loader2 size={13} className="animate-spin" /> : <PersonStanding size={13} />} Model
          </IconButton>
          {(urls.flatlay || urls.model) && (
            <IconButton label="Show pieces" onClick={() => setView('pieces')} active={shown === 'pieces'}>
              <LayoutGrid size={13} />
            </IconButton>
          )}
          {shown !== 'pieces' && shownUrl && (
            <>
              <IconButton label={shown === 'model' ? 'Regenerate model image' : 'Regenerate look image'} onClick={() => actions.generateImage(outfit, shown)} disabled={pending[shown]}>
                <RefreshCw size={13} />
              </IconButton>
              <a
                href={shownUrl}
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
          )}
          <IconButton label={outfit.worn_on ? 'Worn' : 'Wore it'} onClick={() => run('wear', () => actions.wear(outfit))} disabled={!!outfit.worn_on || busy !== null} active={!!outfit.worn_on}>
            {busy === 'wear' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {outfit.worn_on ? 'Worn' : 'Wore it'}
          </IconButton>
          <IconButton label={outfit.saved ? 'Saved' : 'Save'} onClick={() => run('save', () => actions.toggleSave(outfit))} disabled={busy !== null} active={outfit.saved}>
            {outfit.saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </IconButton>
          <div className="relative">
            <IconButton label="Move to a day" onClick={() => setMoving(m => !m)} disabled={busy !== null} active={moving}>
              {busy === 'move' ? <Loader2 size={13} className="animate-spin" /> : <CalendarDays size={13} />}
            </IconButton>
            {moving && (
              <MoveMenu
                outfit={outfit}
                onClose={() => setMoving(false)}
                onPick={date => {
                  setMoving(false)
                  run('move', () => actions.move(outfit, date))
                }}
              />
            )}
          </div>
          <IconButton label="Edit pieces" onClick={() => actions.edit(outfit)}>
            <Pencil size={13} />
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
