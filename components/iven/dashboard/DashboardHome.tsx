'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Check, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WIDGETS, WIDGET_MAP } from './registry'
import { loadLayout, saveLayout, reconcile } from '@/lib/dashboard/layout'
import type { DashboardLayoutConfig, DashboardWidgetLayout } from '@/types/health'

// Absolute drag-and-move dashboard. Each widget is positioned by pixel x/y/w/h
// (same native-pointer-event scheme as the Reading app's draggable book popup).
// Drag and resize are gated behind Edit Layout; outside edit mode widgets are
// static and fully interactive.

type DragSession = {
  i: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  base: DashboardWidgetLayout
}

export default function DashboardHome() {
  const supabase = useMemo(() => createClient(), [])
  const [config, setConfig] = useState<DashboardLayoutConfig | null>(null)
  const [editing, setEditing] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drag = useRef<DragSession | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLayout(supabase).then(setConfig)
  }, [supabase])

  function persist(next: DashboardLayoutConfig) {
    setConfig(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveLayout(supabase, next), 700)
  }

  // Live drag/resize. We mutate React state on every pointermove so the widget
  // tracks the cursor; the debounced persist() handles the eventual save.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      setConfig(prev => {
        if (!prev) return prev
        const def = WIDGET_MAP[d.i]
        const layout = prev.layout.map(l => {
          if (l.i !== d.i) return l
          if (d.mode === 'move') {
            return { ...l, x: Math.max(0, d.base.x + dx), y: Math.max(0, d.base.y + dy) }
          }
          return {
            ...l,
            w: Math.max(def?.minW ?? 200, d.base.w + dx),
            h: Math.max(def?.minH ?? 140, d.base.h + dy),
          }
        })
        return { ...prev, layout }
      })
    }
    function onUp() {
      if (!drag.current) return
      drag.current = null
      // Commit whatever the live state currently holds.
      setConfig(prev => {
        if (prev) {
          if (saveTimer.current) clearTimeout(saveTimer.current)
          saveTimer.current = setTimeout(() => saveLayout(supabase, prev), 300)
        }
        return prev
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [supabase])

  function startDrag(e: React.PointerEvent, l: DashboardWidgetLayout, mode: 'move' | 'resize') {
    if (!editing) return
    e.preventDefault()
    drag.current = { i: l.i, mode, startX: e.clientX, startY: e.clientY, base: l }
  }

  function addWidget(id: string) {
    if (!config || config.widgets.includes(id)) return
    persist(reconcile({ ...config, widgets: [...config.widgets, id] }))
  }

  function removeWidget(id: string) {
    if (!config) return
    persist({
      widgets: config.widgets.filter(w => w !== id),
      layout: config.layout.filter(l => l.i !== id),
    })
  }

  if (!config) {
    return <div className="p-7 font-mono text-xs" style={{ color: 'var(--iven-muted)' }}>Loading dashboard…</div>
  }

  const available = WIDGETS.filter(w => !config.widgets.includes(w.id))
  const byId = new Map(config.layout.map(l => [l.i, l]))
  // Size the canvas to fit the lowest/right-most widget so it scrolls cleanly.
  const canvasHeight = Math.max(0, ...config.layout.map(l => l.y + l.h)) + (editing ? 120 : 24)

  return (
    <div className="p-7">
      <div className="flex justify-end mb-3 gap-2">
        {editing && available.length > 0 && (
          <button
            onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-[1.5px] uppercase px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
          >
            <Plus size={13} /> Add Widget
          </button>
        )}
        <button
          onClick={() => {
            setEditing(v => !v)
            setShowPicker(false)
          }}
          className="flex items-center gap-1.5 font-mono text-[10px] tracking-[1.5px] uppercase px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{
            background: editing ? 'var(--iven-accent)' : 'transparent',
            border: '1px solid var(--iven-border)',
            color: editing ? 'var(--iven-bg)' : 'var(--iven-text)',
          }}
        >
          {editing ? <><Check size={13} /> Done</> : <><Pencil size={13} /> Edit Layout</>}
        </button>
      </div>

      {showPicker && editing && (
        <div
          className="mb-4 rounded-xl p-4 flex flex-wrap gap-2"
          style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
        >
          {available.map(w => (
            <button
              key={w.id}
              onClick={() => addWidget(w.id)}
              className="font-mono text-[10px] tracking-[1px] px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
            >
              + {w.label}
            </button>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: canvasHeight }}
      >
        {config.widgets.map(id => {
          const def = WIDGET_MAP[id]
          const l = byId.get(id)
          if (!def || !l) return null
          const Widget = def.component
          return (
            <div
              key={id}
              onPointerDown={editing ? e => startDrag(e, l, 'move') : undefined}
              className="absolute"
              style={{
                left: l.x,
                top: l.y,
                width: l.w,
                height: l.h,
                touchAction: editing ? 'none' : undefined,
                cursor: editing ? 'grab' : undefined,
                outline: editing ? '1px dashed var(--iven-border)' : undefined,
                borderRadius: 12,
              }}
            >
              {editing && (
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => removeWidget(id)}
                  className="absolute -top-2 -right-2 z-20 rounded-full p-1"
                  style={{ background: '#B5532E', color: '#fff' }}
                  aria-label={`Remove ${def.label}`}
                >
                  <X size={12} />
                </button>
              )}
              <div
                className="h-full w-full overflow-hidden"
                style={{ pointerEvents: editing ? 'none' : 'auto', borderRadius: 12 }}
              >
                <Widget />
              </div>
              {editing && (
                <div
                  onPointerDown={e => {
                    e.stopPropagation()
                    startDrag(e, l, 'resize')
                  }}
                  className="absolute bottom-0 right-0 z-20"
                  style={{
                    width: 16,
                    height: 16,
                    cursor: 'nwse-resize',
                    background: 'var(--iven-accent)',
                    borderRadius: '3px 0 12px 0',
                    touchAction: 'none',
                  }}
                  aria-label={`Resize ${def.label}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
