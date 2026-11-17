'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Copy, ExternalLink, FileText, Loader2, Trash2, UploadCloud, Check, AlertTriangle } from 'lucide-react'
import { fetchPublicViewSettings, updatePublicViewSettings } from '@/lib/public-view/supabase'
import { RESUME_MAX_BYTES, SITE_FILES_BUCKET, resumeKind, type ResumeFileInfo } from '@/lib/site-settings/resume'
import { Section, FieldRow, Input } from './ui'
import { SaveButton } from './SiteSettingsPanel'

const PUBLIC_RESUME_URL = 'https://www.stephenonochie.com/resume'

type Phase = 'idle' | 'uploading' | 'converting' | 'done'

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ResumePanel({ supabase }: { supabase: SupabaseClient }) {
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState<ResumeFileInfo | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState('')
  const [fallbackSave, setFallbackSave] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [docxSupported, setDocxSupported] = useState(true)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetchPublicViewSettings(supabase),
      fetch('/api/site-settings/resume').then(r => (r.ok ? r.json() : { docxSupported: true })),
    ])
      .then(([s, cfg]) => {
        setFallbackUrl(s.resume_url)
        setDocxSupported(cfg.docxSupported)
        if (s.resume_file_path && s.resume_file_name && s.resume_uploaded_at) {
          setCurrent({ fileName: s.resume_file_name, size: s.resume_file_size ?? 0, uploadedAt: s.resume_uploaded_at })
        }
      })
      .finally(() => setLoading(false))
  }, [supabase])

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      const kind = resumeKind(file.name)
      if (!kind) return setError('Drop a .pdf or .docx file.')
      if (file.size > RESUME_MAX_BYTES) return setError('That file is larger than 10 MB.')
      if (kind === 'docx' && !docxSupported) {
        return setError('Word conversion needs CONVERTAPI_SECRET in Vercel. Until then, export to PDF from Word (File → Save As → PDF) and drop that.')
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return setError('Signed out. Refresh and sign in again.')

      setPhase('uploading')
      const safeName = file.name.replace(/[^\w.-]+/g, '_')
      const path = `${session.user.id}/uploads/${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from(SITE_FILES_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (upErr) {
        setPhase('idle')
        return setError(upErr.message)
      }

      setPhase(kind === 'docx' ? 'converting' : 'uploading')
      const res = await fetch('/api/site-settings/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, fileName: file.name }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPhase('idle')
        return setError(json.error ?? 'Upload failed')
      }
      setCurrent(json as ResumeFileInfo)
      setPhase('done')
      setTimeout(() => setPhase('idle'), 2200)
    },
    [supabase, docxSupported]
  )

  async function removeFile() {
    if (!confirm('Remove the uploaded résumé? /resume will fall back to the external link.')) return
    const res = await fetch('/api/site-settings/resume', { method: 'DELETE' })
    if (res.ok) setCurrent(null)
    else setError('Could not remove the file.')
  }

  async function saveFallback() {
    setFallbackSave('saving')
    await updatePublicViewSettings(supabase, { resume_url: fallbackUrl.trim() })
    setFallbackSave('saved')
    setTimeout(() => setFallbackSave('idle'), 1800)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(PUBLIC_RESUME_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--iven-muted)' }}>
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    )
  }

  const busy = phase === 'uploading' || phase === 'converting'

  return (
    <div className="flex flex-col gap-6 max-w-[620px]">
      <Section title="Public link">
        <div className="flex flex-wrap items-center gap-2">
          <code
            className="font-mono text-[13px] px-3 py-2 rounded flex-1 min-w-[220px]"
            style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
          >
            stephenonochie.com/resume
          </code>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px] px-3 py-2 rounded"
            style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <a
            href="/resume"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px] px-3 py-2 rounded"
            style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
          >
            <ExternalLink size={13} /> Open
          </a>
        </div>
        <p className="text-[12px] m-0" style={{ color: 'var(--iven-muted)' }}>
          Opens the PDF straight in the browser, served from your site. Every résumé button on the
          portfolio points here.
        </p>
      </Section>

      <Section title="Résumé file">
        {current && (
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-grid)' }}
          >
            <FileText size={20} style={{ color: 'var(--iven-accent)' }} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] truncate" style={{ color: 'var(--iven-text)' }}>
                {current.fileName}
              </div>
              <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--iven-muted)' }}>
                Live PDF · {formatSize(current.size)} · updated {formatWhen(current.uploadedAt)}
              </div>
            </div>
            <button onClick={removeFile} aria-label="Remove résumé" className="p-1.5 rounded" style={{ color: 'var(--iven-muted)' }}>
              <Trash2 size={15} />
            </button>
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ' ') && !busy) {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={e => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file && !busy) handleFile(file)
          }}
          className="flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-10 text-center cursor-pointer transition-colors"
          style={{
            border: `1.5px dashed ${dragging ? 'var(--iven-accent)' : 'var(--iven-grid)'}`,
            background: dragging ? 'color-mix(in srgb, var(--iven-accent) 8%, var(--iven-bg))' : 'var(--iven-bg)',
          }}
        >
          {busy ? (
            <>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--iven-accent)' }} />
              <div className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
                {phase === 'converting' ? 'Converting Word to PDF…' : 'Uploading…'}
              </div>
            </>
          ) : phase === 'done' ? (
            <>
              <Check size={24} style={{ color: '#7C8C5A' }} />
              <div className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
                Live at stephenonochie.com/resume
              </div>
            </>
          ) : (
            <>
              <UploadCloud size={24} style={{ color: 'var(--iven-accent)' }} />
              <div className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
                {current ? 'Drop a new version to replace it' : 'Drop your résumé here'}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
                .pdf or .docx · up to 10 MB · or click to choose
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) handleFile(file)
            }}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-[12px]" style={{ color: '#B5532E' }}>
            <AlertTriangle size={14} className="shrink-0 mt-[1px]" /> {error}
          </div>
        )}
        {!docxSupported && !error && (
          <p className="text-[12px] m-0" style={{ color: 'var(--iven-muted)' }}>
            PDFs work now. To drop .docx files directly, add a ConvertAPI key as CONVERTAPI_SECRET in Vercel.
          </p>
        )}
      </Section>

      <Section title="Fallback link">
        <FieldRow label="Used by /resume only while no file is uploaded">
          <Input value={fallbackUrl} onChange={setFallbackUrl} placeholder="https://…" />
        </FieldRow>
        <div>
          <SaveButton state={fallbackSave} onClick={saveFallback} label="Save link" />
        </div>
      </Section>
    </div>
  )
}
