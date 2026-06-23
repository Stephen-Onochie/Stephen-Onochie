'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
// react-grid-layout v2: hooks-based API (no WidthProvider). The bundled v1
// @types don't match, so this module is typed locally in types/rgl.d.ts.
import { Responsive, useContainerWidth, getCompactor } from 'react-grid-layout'
type Layout = { i: string; x: number; y: number; w: number; h: number }
import { Pencil, Check, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WIDGETS, WIDGET_MAP } from './registry'
import { loadLayout, saveLayout, reconcile } from '@/lib/dashboard/layout'
import type { DashboardLayoutConfig } from '@/types/health'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
const ROW_HEIGHT = 70
// Free positioning: no auto-rearrange, overlap allowed. Constructed once so
// rgl doesn't treat a new compactor identity as a config change each render.
const FREE_COMPACTOR = getCompactor('vertical', true, false)

export default function DashboardHome() {
  const supabase = useMemo(() => createClient(), [])
  const { width, containerRef, mounted } = useContainerWidth()
  const [config, setConfig] = useState<DashboardLayoutConfig | null>(null)
  const [editing, setEditing] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadLayout(supabase).then(setConfig)
  }, [supabase])

  function persist(next: DashboardLayoutConfig) {
    setConfig(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveLayout(supabase, next), 700)
  }

  function onLayoutChange(layout: Layout[]) {
    if (!config || !editing) return
    const merged = layout
      .filter(l => WIDGET_MAP[l.i])
      .map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
    persist({ ...config, layout: merged })
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

  return (
    <div className="p-7" ref={containerRef}>
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

      {mounted && (
      <Responsive
        className="layout"
        layouts={{ lg: config.layout, md: config.layout }}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        width={width}
        rowHeight={ROW_HEIGHT}
        margin={[16, 16]}
        compactor={FREE_COMPACTOR}
        dragConfig={{ bounded: false }}
        isDraggable={editing}
        isResizable={editing}
        onLayoutChange={onLayoutChange}
        draggableCancel=".widget-remove"
      >
        {config.widgets.map(id => {
          const def = WIDGET_MAP[id]
          if (!def) return null
          const Widget = def.component
          return (
            <div key={id} data-grid={{ ...def.defaultLayout, i: id, minW: def.minW, minH: def.minH }} style={{ position: 'relative' }}>
              {editing && (
                <button
                  onClick={() => removeWidget(id)}
                  className="widget-remove absolute -top-2 -right-2 z-10 rounded-full p-1"
                  style={{ background: '#B5532E', color: '#fff' }}
                  aria-label={`Remove ${def.label}`}
                >
                  <X size={12} />
                </button>
              )}
              <div className="h-full" style={{ pointerEvents: editing ? 'none' : 'auto' }}>
                <Widget />
              </div>
            </div>
          )
        })}
      </Responsive>
      )}
    </div>
  )
}
