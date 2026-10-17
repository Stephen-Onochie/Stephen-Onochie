'use client'

import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Camera, Check, ImagePlus, Loader2, X } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resizeForUpload } from '@/lib/stylemate/resize'
import { uploadScanPhoto, withItemUrls } from '@/lib/stylemate/supabase'
import type { WardrobeItem, WardrobeItemView } from '@/types/stylemate'
import { Button } from './shared'

const CONCURRENCY = 3

interface ScanJob {
  id: string
  file: File
  preview: string
  state: 'queued' | 'uploading' | 'tagging' | 'done' | 'empty' | 'error'
  found: string[]
  error?: string
}

export default function ScanDialog({
  open,
  dark,
  supabase,
  userId,
  onClose,
  onItems,
}: {
  open: boolean
  dark: boolean
  supabase: SupabaseClient
  userId: string
  onClose: () => void
  onItems: (items: WardrobeItemView[]) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [jobs, setJobs] = useState<ScanJob[]>([])
  const running = jobs.some(j => j.state === 'queued' || j.state === 'uploading' || j.state === 'tagging')

  function patch(id: string, update: Partial<ScanJob>) {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, ...update } : j)))
  }

  async function processJob(job: ScanJob) {
    try {
      patch(job.id, { state: 'uploading' })
      const blob = await resizeForUpload(job.file)
      const path = await uploadScanPhoto(supabase, userId, blob)
      patch(job.id, { state: 'tagging' })
      const res = await fetch('/api/stylemate/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? 'Scan failed')
      const items = (payload.items as WardrobeItem[]) ?? []
      if (items.length === 0) {
        patch(job.id, { state: 'empty', error: payload.note })
        return
      }
      onItems(await withItemUrls(supabase, items))
      patch(job.id, { state: 'done', found: items.map(i => i.name) })
    } catch (err) {
      patch(job.id, { state: 'error', error: err instanceof Error ? err.message : 'Scan failed' })
    }
  }

  async function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (files.length === 0) return
    const newJobs: ScanJob[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      state: 'queued',
      found: [],
    }))
    setJobs(prev => [...newJobs, ...prev])

    let next = 0
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, newJobs.length) }, async () => {
        while (next < newJobs.length) await processJob(newJobs[next++])
      }),
    )
  }

  function close() {
    if (running) return
    jobs.forEach(j => URL.revokeObjectURL(j.preview))
    setJobs([])
    onClose()
  }

  const done = jobs.filter(j => j.state === 'done').reduce((n, j) => n + j.found.length, 0)

  return (
    <Dialog.Root open={open} onOpenChange={o => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          data-iven-theme={dark ? 'dark' : 'light'}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(640px,94vw)] max-h-[88vh] overflow-y-auto rounded-2xl p-6"
          style={{ background: 'var(--iven-bg)', color: 'var(--iven-text)', border: '1px solid var(--iven-border)' }}
        >
          <div className="flex items-start justify-between gap-4 mb-1">
            <Dialog.Title className="font-playfair text-2xl font-bold">Scan clothes</Dialog.Title>
            <button type="button" onClick={close} disabled={running} aria-label="Close" style={{ color: 'var(--iven-muted)' }}>
              <X size={18} />
            </button>
          </div>
          <Dialog.Description className="font-inter text-sm mb-5" style={{ color: 'var(--iven-muted)' }}>
            Pick as many photos as you want. One piece per photo works best, but a laid-out pile works too: Claude splits it into separate items. Clean product images generate in the background.
          </Dialog.Description>

          <div className="flex flex-wrap gap-2 mb-5">
            <Button onClick={() => fileRef.current?.click()}>
              <ImagePlus size={14} /> Choose photos
            </Button>
            <Button variant="ghost" onClick={() => cameraRef.current?.click()}>
              <Camera size={14} /> Take photo
            </Button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
          </div>

          {jobs.length > 0 && (
            <>
              <div className="font-mono text-[11px] uppercase tracking-[1.5px] mb-3" style={{ color: 'var(--iven-muted)' }}>
                {running ? `Scanning… ${done} item${done === 1 ? '' : 's'} added` : `${done} item${done === 1 ? '' : 's'} added to your closet`}
              </div>
              <ul className="flex flex-col gap-2">
                {jobs.map(job => (
                  <li key={job.id} className="flex items-center gap-3 rounded-xl p-2" style={{ background: 'var(--iven-surface)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={job.preview} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-sm truncate">
                        {job.state === 'done' ? job.found.join(', ') : job.file.name}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: job.state === 'error' ? '#B4452F' : 'var(--iven-muted)' }}>
                        {job.state === 'queued' && 'Waiting'}
                        {job.state === 'uploading' && 'Uploading'}
                        {job.state === 'tagging' && 'Claude is tagging'}
                        {job.state === 'done' && `${job.found.length} piece${job.found.length === 1 ? '' : 's'} added`}
                        {job.state === 'empty' && (job.error ?? 'No clothing found')}
                        {job.state === 'error' && job.error}
                      </p>
                    </div>
                    {(job.state === 'uploading' || job.state === 'tagging') && <Loader2 size={16} className="animate-spin shrink-0" style={{ color: 'var(--iven-accent)' }} />}
                    {job.state === 'done' && <Check size={16} className="shrink-0" style={{ color: 'var(--iven-accent)' }} />}
                  </li>
                ))}
              </ul>
            </>
          )}

          {jobs.length > 0 && !running && (
            <div className="mt-5 flex justify-end">
              <Button onClick={close}>Done</Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
