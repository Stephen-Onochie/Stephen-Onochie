'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ExternalLink, Loader2, PackageCheck, RefreshCw, Trash2, X } from 'lucide-react'
import { APPAREL_CATEGORIES, OCCASIONS, SEASONS } from '@/lib/stylemate/constants'
import type { ApparelCategory, WardrobeItem, WardrobeItemView } from '@/types/stylemate'
import { Button, Chip, inputStyle, ItemImage, SectionLabel } from './shared'

type Draft = Pick<
  WardrobeItem,
  | 'name' | 'category' | 'sub_type' | 'color' | 'color_hex' | 'colors' | 'pattern' | 'material' | 'fit' | 'brand'
  | 'size' | 'description' | 'formality' | 'warmth' | 'seasons' | 'occasions' | 'style_tags'
  | 'min_temp_threshold' | 'max_temp_threshold'
>

function toDraft(item: WardrobeItem): Draft {
  return {
    name: item.name, category: item.category, sub_type: item.sub_type, color: item.color, color_hex: item.color_hex,
    colors: item.colors, pattern: item.pattern, material: item.material, fit: item.fit, brand: item.brand,
    size: item.size, description: item.description, formality: item.formality, warmth: item.warmth,
    seasons: item.seasons, occasions: item.occasions, style_tags: item.style_tags,
    min_temp_threshold: item.min_temp_threshold, max_temp_threshold: item.max_temp_threshold,
  }
}

const listToText = (list: string[]) => list.join(', ')
const textToList = (text: string) => text.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: 'var(--iven-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="font-inter text-sm rounded-lg px-3 py-2 w-full outline-none"
      style={inputStyle()}
    />
  )
}

function Scale({ value, onChange, low, high }: { value: number; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="flex-1 h-8 rounded-md font-mono text-xs"
            style={n <= value ? { background: 'var(--iven-accent)', color: '#2C1F0E' } : { border: '1px solid var(--iven-grid)', color: 'var(--iven-muted)' }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between font-inter text-[10px] mt-1" style={{ color: 'var(--iven-muted)' }}>
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

export default function ItemDialog({
  item,
  renderError,
  dark,
  onClose,
  onSave,
  onDelete,
  onApprove,
  onRerender,
}: {
  item: WardrobeItemView | null
  renderError: string | null
  dark: boolean
  onClose: () => void
  onSave: (item: WardrobeItemView, patch: Partial<WardrobeItem>) => Promise<void>
  onDelete: (item: WardrobeItemView) => Promise<void>
  onApprove: (item: WardrobeItemView) => Promise<void>
  onRerender: (item: WardrobeItemView) => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [colorsText, setColorsText] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [showPhoto, setShowPhoto] = useState(false)
  const [busy, setBusy] = useState<'save' | 'delete' | 'approve' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!item) return
    setDraft(toDraft(item))
    setColorsText(listToText(item.colors))
    setTagsText(listToText(item.style_tags))
    setShowPhoto(false)
    setConfirmDelete(false)
    // Reset only when switching items so a render finishing mid-edit keeps the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])

  if (!item || !draft) return null
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => (d ? { ...d, [key]: value } : d))

  async function run(kind: 'save' | 'delete' | 'approve', action: () => Promise<void>) {
    setBusy(kind)
    try {
      await action()
    } finally {
      setBusy(null)
    }
  }

  const save = () =>
    run('save', () => onSave(item, { ...draft!, colors: textToList(colorsText), style_tags: textToList(tagsText) }))
  const rendering = item.render_status === 'pending'

  return (
    <Dialog.Root open onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          data-iven-theme={dark ? 'dark' : 'light'}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(920px,96vw)] max-h-[92vh] overflow-y-auto rounded-2xl"
          style={{ background: 'var(--iven-bg)', color: 'var(--iven-text)', border: '1px solid var(--iven-border)' }}
        >
          <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="p-5 md:border-r" style={{ borderColor: 'var(--iven-grid)' }}>
              <ItemImage item={item} preferPhoto={showPhoto} className="aspect-square rounded-xl" />
              <div className="flex flex-wrap gap-2 mt-3">
                {item.render_url && item.photo_url && (
                  <Chip active={showPhoto} onClick={() => setShowPhoto(p => !p)}>
                    {showPhoto ? 'Showing photo' : 'Show photo'}
                  </Chip>
                )}
                <Button variant="ghost" onClick={() => onRerender(item)} disabled={rendering}>
                  {rendering ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {item.render_url ? 'Re-render' : rendering ? 'Rendering' : 'Render image'}
                </Button>
              </div>
              {item.render_status === 'failed' && (
                <p className="font-inter text-xs mt-2" style={{ color: '#B4452F' }}>{renderError ? `Render failed: ${renderError}` : 'Last render failed. Try again.'}</p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3 font-inter text-xs" style={{ color: 'var(--iven-muted)' }}>
                <div><SectionLabel>Source</SectionLabel>{item.source === 'gmail' ? `Gmail · ${item.retailer ?? 'order'}` : item.source === 'scan' ? 'Photo scan' : 'Manual'}</div>
                <div><SectionLabel>Worn</SectionLabel>{item.wear_count}x{item.last_worn_on ? ` · last ${item.last_worn_on}` : ''}</div>
                {item.price != null && <div><SectionLabel>Price</SectionLabel>${Number(item.price).toFixed(2)}</div>}
                {item.ordered_at && <div><SectionLabel>Ordered</SectionLabel>{item.ordered_at.slice(0, 10)}</div>}
              </div>
              {item.product_url && (
                <a href={item.product_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 font-inter text-xs underline" style={{ color: 'var(--iven-accent)' }}>
                  Product page <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Dialog.Title asChild>
                  <input
                    value={draft.name}
                    onChange={e => set('name', e.target.value)}
                    className="flex-1 font-playfair text-2xl font-bold bg-transparent outline-none"
                    style={{ color: 'var(--iven-text)' }}
                  />
                </Dialog.Title>
                <button type="button" onClick={onClose} aria-label="Close" style={{ color: 'var(--iven-muted)' }}>
                  <X size={18} />
                </button>
              </div>
              <Dialog.Description className="sr-only">Edit the AI-assigned attributes for this piece.</Dialog.Description>

              {item.is_incoming && (
                <div className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}>
                  <span className="font-inter text-sm">Found in a Gmail order. Approve it once it arrives.</span>
                  <Button onClick={() => run('approve', () => onApprove(item))} disabled={busy !== null}>
                    {busy === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <PackageCheck size={13} />} Approve
                  </Button>
                </div>
              )}

              <div>
                <SectionLabel>Category</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {APPAREL_CATEGORIES.map(c => (
                    <Chip key={c.value} active={draft.category === c.value} onClick={() => set('category', c.value as ApparelCategory)}>
                      {c.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Type"><TextInput value={draft.sub_type ?? ''} onChange={v => set('sub_type', v || null)} /></Field>
                <Field label="Brand"><TextInput value={draft.brand ?? ''} onChange={v => set('brand', v || null)} /></Field>
                <Field label="Main color">
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={draft.color_hex ?? '#888888'}
                      onChange={e => set('color_hex', e.target.value.toUpperCase())}
                      className="w-10 h-[38px] rounded-lg cursor-pointer shrink-0"
                      style={inputStyle()}
                      aria-label="Color swatch"
                    />
                    <TextInput value={draft.color} onChange={v => set('color', v)} />
                  </div>
                </Field>
                <Field label="All colors"><TextInput value={colorsText} onChange={setColorsText} placeholder="black, white" /></Field>
                <Field label="Pattern"><TextInput value={draft.pattern ?? ''} onChange={v => set('pattern', v || null)} /></Field>
                <Field label="Material"><TextInput value={draft.material ?? ''} onChange={v => set('material', v || null)} /></Field>
                <Field label="Fit"><TextInput value={draft.fit ?? ''} onChange={v => set('fit', v || null)} /></Field>
                <Field label="Size"><TextInput value={draft.size ?? ''} onChange={v => set('size', v || null)} /></Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Formality"><Scale value={draft.formality} onChange={v => set('formality', v)} low="Gym" high="Formal" /></Field>
                <Field label="Warmth"><Scale value={draft.warmth} onChange={v => set('warmth', v)} low="Light" high="Winter" /></Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Min °F">
                  <input type="number" value={draft.min_temp_threshold} onChange={e => set('min_temp_threshold', Number(e.target.value))} className="font-inter text-sm rounded-lg px-3 py-2 outline-none" style={inputStyle()} />
                </Field>
                <Field label="Max °F">
                  <input type="number" value={draft.max_temp_threshold} onChange={e => set('max_temp_threshold', Number(e.target.value))} className="font-inter text-sm rounded-lg px-3 py-2 outline-none" style={inputStyle()} />
                </Field>
              </div>

              <div>
                <SectionLabel>Occasions</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {OCCASIONS.map(o => (
                    <Chip key={o} active={draft.occasions.includes(o)} onClick={() => set('occasions', toggle(draft.occasions, o))}>
                      {o.replace('_', ' ')}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Seasons</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {SEASONS.map(s => (
                    <Chip key={s} active={draft.seasons.includes(s)} onClick={() => set('seasons', toggle(draft.seasons, s))}>{s}</Chip>
                  ))}
                </div>
              </div>

              <Field label="Style tags"><TextInput value={tagsText} onChange={setTagsText} placeholder="streetwear, minimalist" /></Field>

              <Field label="Notes">
                <textarea
                  value={draft.description ?? ''}
                  onChange={e => set('description', e.target.value || null)}
                  rows={2}
                  className="font-inter text-sm rounded-lg px-3 py-2 outline-none resize-none"
                  style={inputStyle()}
                />
              </Field>


              <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: 'var(--iven-grid)' }}>
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={() => run('delete', () => onDelete(item))} disabled={busy !== null}>
                      {busy === 'delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setConfirmDelete(true)}><Trash2 size={13} /> Delete</Button>
                )}
                <Button onClick={save} disabled={busy !== null}>
                  {busy === 'save' && <Loader2 size={13} className="animate-spin" />} Save
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
