'use client'

import { useEffect, useRef, useState } from 'react'
import { parseTodoInput, formatDue } from '@/lib/todo/parse'

interface QuickAddProps {
  placeholder: string
  onAdd: (title: string, dueAt: string | null) => void | Promise<void>
}

export default function QuickAdd({ placeholder, onAdd }: QuickAddProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Press "/" anywhere to focus the quick-add bar (keyboard-first capture).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const preview = value.trim() ? parseTodoInput(value) : null

  async function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    const { title, dueAt } = parseTodoInput(trimmed)
    setValue('')
    await onAdd(title, dueAt)
  }

  return (
    <div className="bg-surface border border-goldLight rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-textMuted text-lg" aria-hidden="true">
          +
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none font-inter text-textPrimary placeholder:text-textMuted"
        />
      </div>
      {preview?.dueAt && (
        <p className="mt-1.5 pl-7 font-inter text-xs text-brownAccent">
          📅 {formatDue(preview.dueAt)}
        </p>
      )}
    </div>
  )
}
