'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface AddItemInput {
  name: string
  dims: { w: number; d: number; h: number } // inches
  image: string // data URL
  feedback?: string
}

interface AddItemDialogProps {
  open: boolean
  night: boolean
  initial: AddItemInput | null // set when regenerating
  onClose: () => void
  onGenerated: (spec: DormItemSpec, input: AddItemInput) => void
}

// Downscale to keep the data URL small enough for the API route.
async function fileToDataUrl(file: File, maxDim = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function AddItemDialog({ open, night, initial, onClose, onGenerated }: AddItemDialogProps) {
  const [name, setName] = useState('')
  const [w, setW] = useState('')
  const [d, setD] = useState('')
  const [h, setH] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(false)
    if (initial) {
      setName(initial.name)
      setW(String(initial.dims.w))
      setD(String(initial.dims.d))
      setH(String(initial.dims.h))
      setImage(initial.image)
      setFeedback(initial.feedback ?? '')
    } else {
      setName('')
      setW('')
      setD('')
      setH('')
      setImage(null)
      setFeedback('')
    }
  }, [open, initial])

  if (!open) return null

  const dims = { w: parseFloat(w), d: parseFloat(d), h: parseFloat(h) }
  const dimsValid = [dims.w, dims.d, dims.h].every((v) => Number.isFinite(v) && v > 0)
  const canGenerate = !!name.trim() && dimsValid && !!image && !busy

  const generate = async () => {
    if (!canGenerate || !image) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/dorm/generate-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          dims,
          image,
          feedback: feedback.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
      onGenerated(json.spec as DormItemSpec, {
        name: name.trim(),
        dims,
        image,
        feedback: feedback.trim() || undefined,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
      setBusy(false)
    }
  }

  const inputCls = cn(
    'w-full rounded-lg border px-3 py-2 font-inter text-sm outline-none transition-colors duration-200 focus:border-gold',
    night
      ? 'border-[#4A3D2A] bg-[#14100C] text-[#F5F0E8] placeholder:text-[#8C7355]'
      : 'border-grid bg-beige text-textPrimary placeholder:text-textMuted'
  )
  const labelCls = 'font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-textMuted'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2C1F0E]/50" onClick={busy ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add custom item"
        className={cn(
          'relative w-full max-w-md rounded-2xl border p-5 shadow-[0_12px_40px_rgba(44,31,14,0.35)]',
          night ? 'border-[#4A3D2A] bg-[#221A12] text-[#F5F0E8]' : 'border-goldLight bg-surface text-textPrimary'
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-textMuted">
            {initial ? 'Regenerate Item' : 'Add Item'}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="font-mono text-sm text-textMuted transition-colors duration-200 hover:text-gold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className={labelCls} htmlFor="dorm-item-name">Name</label>
            <input
              id="dorm-item-name"
              className={cn(inputCls, 'mt-1')}
              placeholder="Bookshelf"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </div>

          <div>
            <span className={labelCls}>Dimensions (inches)</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <input className={inputCls} placeholder="W" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} disabled={busy} aria-label="Width in inches" />
              <input className={inputCls} placeholder="D" inputMode="decimal" value={d} onChange={(e) => setD(e.target.value)} disabled={busy} aria-label="Depth in inches" />
              <input className={inputCls} placeholder="H" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} disabled={busy} aria-label="Height in inches" />
            </div>
          </div>

          <div>
            <span className={labelCls}>Photo</span>
            <div className="mt-1 flex items-center gap-3">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Item preview" className="h-16 w-16 rounded-lg border border-grid object-cover" />
              ) : (
                <div className={cn('flex h-16 w-16 items-center justify-center rounded-lg border border-dashed', night ? 'border-[#4A3D2A]' : 'border-grid')}>
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-textMuted">None</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="rounded-lg border border-grid px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-textMuted transition-colors duration-200 hover:border-gold hover:text-gold"
              >
                {image ? 'Replace photo' : 'Upload photo'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    setImage(await fileToDataUrl(file))
                    setError(null)
                  } catch {
                    setError('Could not read that image')
                  }
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          {initial && (
            <div>
              <label className={labelCls} htmlFor="dorm-item-feedback">What should change?</label>
              <textarea
                id="dorm-item-feedback"
                className={cn(inputCls, 'mt-1 h-20 resize-none')}
                placeholder="Make the legs thinner and the top darker"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={busy}
              />
            </div>
          )}

          {error && <p className="font-inter text-xs leading-relaxed text-[#E5484D]">{error}</p>}

          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            className={cn(
              'block w-full rounded-lg bg-gold py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-textPrimary transition-colors duration-200 hover:bg-brownAccent hover:text-beige disabled:opacity-50 disabled:hover:bg-gold disabled:hover:text-textPrimary',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'
            )}
          >
            {busy ? 'Generating…' : 'Generate 3D item'}
          </button>
          <p className="font-inter text-[11px] leading-relaxed text-textMuted">
            The photo and dimensions are sent to a vision model that builds a low-poly
            version in the room&rsquo;s style. You can regenerate before accepting.
          </p>
        </div>
      </div>
    </div>
  )
}
