'use client'

import { useRef, useState } from 'react'
import TagEditor, { type TagEditorValues } from '@/components/stylemate/TagEditor'
import type { GeminiTagResult } from '@/types/stylemate'

type AddStep = 'pick' | 'analyzing' | 'review' | 'error'

interface AddItemFlowProps {
  onSave: (file: File, values: TagEditorValues) => Promise<void>
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function PhotoPreview({ previewUrl, dimmed }: { previewUrl: string; dimmed?: boolean }) {
  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-surface border border-goldLight mb-6 max-w-xs mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt="Preview"
        className={`w-full h-full object-contain ${dimmed ? 'opacity-70' : ''}`}
      />
    </div>
  )
}

export default function AddItemFlow({ onSave }: AddItemFlowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<AddStep>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [tags, setTags] = useState<GeminiTagResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setStep('pick')
    setFile(null)
    setPreviewUrl(null)
    setTags(null)
    setError(null)
    setSaving(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setError(null)
    const url = URL.createObjectURL(selected)
    setPreviewUrl(url)
    setStep('analyzing')

    try {
      const imageBase64 = await fileToBase64(selected)
      const response = await fetch('/api/stylemate/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: selected.type || 'image/jpeg',
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? 'Analysis failed')
      }

      setTags(payload.tags as GeminiTagResult)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setStep('error')
    }
  }

  async function handleSave(values: TagEditorValues) {
    if (!file) return
    setSaving(true)
    try {
      await onSave(file, values)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setStep('error')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'review' && tags && previewUrl) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <h2 className="font-playfair text-xl font-bold text-textPrimary mb-4">Review tags</h2>
        <TagEditor
          initial={tags}
          previewUrl={previewUrl}
          saving={saving}
          onSave={handleSave}
          onCancel={reset}
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {step === 'pick' && (
        <>
          <p className="font-inter text-sm text-textMuted mb-6 text-center">
            Snap a photo of a clothing item to auto-tag it with AI.
          </p>
          <label className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-goldLight rounded-2xl p-10 bg-surface cursor-pointer hover:border-gold transition-colors min-h-[240px]">
            <span className="text-5xl">📷</span>
            <span className="font-inter text-sm font-medium text-textPrimary">
              Tap to take or choose a photo
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </>
      )}

      {step === 'analyzing' && (
        <div className="text-center py-12">
          {previewUrl && <PhotoPreview previewUrl={previewUrl} dimmed />}
          <p className="font-inter text-sm text-textMuted animate-pulse">Analyzing with Gemini...</p>
        </div>
      )}

      {step === 'error' && (
        <div className="text-center py-8">
          {previewUrl && <PhotoPreview previewUrl={previewUrl} />}
          <p className="font-inter text-sm text-brownAccent mb-4">{error ?? 'Something went wrong'}</p>
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 bg-gold text-white font-inter font-semibold rounded-xl hover:bg-brownAccent transition-colors min-h-[48px]"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
