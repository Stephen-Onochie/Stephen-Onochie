'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import RoomPanel from './RoomPanel'
import EditBanner from './EditBanner'
import AddItemDialog, { type AddItemInput } from './AddItemDialog'

const ROOM_DEFAULTS: DormRoomState = {
  mode: 'day',
  lightsOn: false,
  computerOn: false,
  tvOn: false,
  curtainsOpen: true,
  fansOn: false,
  labelsOn: false,
  measurementsOn: false,
  eastWallOn: false,
}

const STAGE_ARIA_LABEL =
  "Interactive 3D diorama of Stephen's Wiley Hall dorm room: a cutaway box with a lofted bed and desk by the window, a brown floor sofa lounge facing a 40-inch TV on a black tiered stand, a reading nook and a mini-fridge kitchen station in the corners, and closets by the door. Use the Room OS panel controls to toggle lights, computer, TV, curtains, day or night, and auto-spin."

function StageSkeleton() {
  return (
    <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-surface/60">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-textMuted">
        Loading room…
      </span>
    </div>
  )
}

const DormStage = dynamic(() => import('./DormStage'), {
  ssr: false,
  loading: () => <StageSkeleton />,
})

interface ServerData {
  layout: DormLayout
  state: DormRoomState | null
  items: DormCustomItem[]
}

interface GenPreview {
  tempId: string
  spec: DormItemSpec
  input: AddItemInput
}

export default function RoomExperience() {
  const [room, setRoom] = useState<DormRoomState>(ROOM_DEFAULTS)
  const [editMode, setEditMode] = useState(false)
  const [walkMode, setWalkMode] = useState(false)
  const [autoSpin, setAutoSpin] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [selected, setSelected] = useState<DormSelection | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [regenInput, setRegenInput] = useState<AddItemInput | null>(null)
  const [preview, setPreview] = useState<GenPreview | null>(null)
  const [saving, setSaving] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [movables, setMovables] = useState<DormMovableInfo[]>([])
  const [storageOpen, setStorageOpen] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const roomElRef = useRef<DormRoomElement | null>(null)
  const uiRef = useRef({ editMode: false, autoSpin: false })
  const mobileInitRef = useRef(false)
  const hydratedRef = useRef(false)
  const serverDataRef = useRef<ServerData | null>(null)
  const snapshotRef = useRef<{ json: string; layout: DormLayout } | null>(null)
  const stateSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingWalkRef = useRef(false)

  const refreshMovables = useCallback(() => {
    const el = roomElRef.current
    if (el) setMovables(el.listMovables())
  }, [])

  const hydrateIfReady = useCallback(() => {
    const el = roomElRef.current
    const data = serverDataRef.current
    if (!el || !data || hydratedRef.current) return
    hydratedRef.current = true
    for (const item of data.items) {
      el.addCustomItem(`custom:${item.id}`, { ...item.spec, name: item.name })
    }
    el.applyLayout(data.layout)
    if (data.state) el.setRoomState(data.state)
    setRoom(el.getRoomState())
    refreshMovables()
  }, [refreshMovables])

  useEffect(() => {
    let cancelled = false
    const safe = async <T,>(url: string, fallback: T): Promise<T> => {
      try {
        const res = await fetch(url)
        if (!res.ok) return fallback
        return (await res.json()) as T
      } catch {
        return fallback
      }
    }
    Promise.all([
      safe<{ layout: DormLayout }>('/api/dorm/layout', { layout: {} }),
      safe<{ state: DormRoomState | null }>('/api/dorm/state', { state: null }),
      safe<{ items: DormCustomItem[] }>('/api/dorm/items', { items: [] }),
    ]).then(([l, s, it]) => {
      if (cancelled) return
      serverDataRef.current = { layout: l.layout ?? {}, state: s.state, items: it.items ?? [] }
      hydrateIfReady()
    })
    return () => {
      cancelled = true
    }
  }, [hydrateIfReady])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const onState = (e: Event) => {
      const detail = (e as CustomEvent<DormRoomState>).detail
      setRoom(detail)
      // Auto-save room toggles, but never before the saved state has been
      // applied (or the defaults would clobber it).
      if (hydratedRef.current) {
        if (stateSaveTimer.current) clearTimeout(stateSaveTimer.current)
        stateSaveTimer.current = setTimeout(() => {
          fetch('/api/dorm/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: detail }),
          }).catch(() => {})
        }, 800)
      }
    }
    const onSelect = (e: Event) => setSelected((e as CustomEvent<DormSelection | null>).detail)
    const onLayout = () => refreshMovables()
    const onWalk = (e: Event) => setWalkMode((e as CustomEvent<{ on: boolean }>).detail.on)
    node.addEventListener('roomstate', onState)
    node.addEventListener('editselect', onSelect)
    node.addEventListener('layoutchange', onLayout)
    node.addEventListener('walkmode', onWalk)
    return () => {
      node.removeEventListener('roomstate', onState)
      node.removeEventListener('editselect', onSelect)
      node.removeEventListener('layoutchange', onLayout)
      node.removeEventListener('walkmode', onWalk)
      if (stateSaveTimer.current) clearTimeout(stateSaveTimer.current)
    }
  }, [refreshMovables])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 859px)')
    const apply = () => {
      setIsMobile(mq.matches)
      if (mq.matches && !mobileInitRef.current) {
        mobileInitRef.current = true
        setPanelOpen(false)
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const handleElement = useCallback(
    (el: DormRoomElement | null) => {
      roomElRef.current = el
      if (!el) return
      // The engine treats undefined _autoRotate as "spin after 6s idle"; the
      // Auto Spin switch starts off, so the real value must be pushed on mount.
      el._autoRotate = uiRef.current.autoSpin
      el.setEditMode(uiRef.current.editMode)
      setRoom(el.getRoomState())
      hydrateIfReady()
    },
    [hydrateIfReady]
  )

  const send = (partial: Partial<DormRoomState>) => {
    roomElRef.current?.setRoomState(partial)
  }

  /* ---------- edit mode with save/discard confirmation ---------- */

  const takeSnapshot = () => {
    const el = roomElRef.current
    if (!el) return
    const layout = el.getLayout()
    snapshotRef.current = { json: JSON.stringify(layout), layout }
  }

  const enterEdit = () => {
    uiRef.current.editMode = true
    setEditMode(true)
    roomElRef.current?.setEditMode(true)
    takeSnapshot()
  }

  const finishEdit = () => {
    uiRef.current.editMode = false
    setEditMode(false)
    setSelected(null)
    setConfirmOpen(false)
    roomElRef.current?.setEditMode(false)
    if (pendingWalkRef.current) {
      pendingWalkRef.current = false
      roomElRef.current?.setWalkMode(true)
    }
  }

  const saveLayout = async () => {
    const el = roomElRef.current
    if (!el) return
    setSaving(true)
    try {
      await fetch('/api/dorm/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: el.getLayout() }),
      })
    } catch {
      /* best-effort; the layout still lives in the engine */
    } finally {
      setSaving(false)
    }
  }

  const requestEditExit = () => {
    const el = roomElRef.current
    if (!el || !snapshotRef.current) {
      finishEdit()
      return
    }
    if (JSON.stringify(el.getLayout()) === snapshotRef.current.json) {
      finishEdit()
      return
    }
    setConfirmOpen(true)
  }

  const confirmSave = async () => {
    await saveLayout()
    finishEdit()
  }

  const confirmDiscard = () => {
    const el = roomElRef.current
    if (el && snapshotRef.current) el.applyLayout(snapshotRef.current.layout)
    finishEdit()
  }

  const handleInteract = (mode: 'view' | 'edit' | 'walk') => {
    if (mode === 'walk') {
      if (walkMode) return
      if (uiRef.current.editMode) {
        pendingWalkRef.current = true
        requestEditExit()
        return
      }
      roomElRef.current?.setWalkMode(true)
    } else if (mode === 'edit') {
      if (uiRef.current.editMode) return
      if (walkMode) roomElRef.current?.setWalkMode(false)
      enterEdit()
    } else {
      if (walkMode) roomElRef.current?.setWalkMode(false)
      if (uiRef.current.editMode) requestEditExit()
    }
  }

  const handleAutoSpin = () => {
    const next = !uiRef.current.autoSpin
    uiRef.current.autoSpin = next
    setAutoSpin(next)
    if (roomElRef.current) roomElRef.current._autoRotate = next
  }

  const handleResetLayout = () => {
    roomElRef.current?.resetLayout()
  }

  /* ---------- custom item flow ---------- */

  const handleGenerated = (spec: DormItemSpec, input: AddItemInput) => {
    const el = roomElRef.current
    if (!el) return
    const tempId = `custom:temp-${crypto.randomUUID()}`
    el.addCustomItem(tempId, spec)
    setPreview({ tempId, spec, input })
    setAddOpen(false)
    setRegenInput(null)
  }

  const acceptPreview = async () => {
    const el = roomElRef.current
    if (!el || !preview) return
    setAccepting(true)
    try {
      const res = await fetch('/api/dorm/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preview.input.name,
          dims: preview.input.dims,
          spec: preview.spec,
          image: preview.input.image,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      el.removeCustomItem(preview.tempId)
      // Accepted items land in Furniture Storage first; place them from the
      // Storage tray when ready.
      el.addCustomItem(
        `custom:${json.id}`,
        { ...preview.spec, name: preview.input.name },
        { kind: 'floor', x: 0.5, z: 4.8, rotY: 0, stored: true }
      )
      // Accepting is an intentional commit: persist the layout now and fold it
      // into the edit-session snapshot so Discard keeps it.
      await saveLayout()
      takeSnapshot()
      refreshMovables()
      setPreview(null)
      setStorageOpen(true)
    } catch {
      // keep the preview so the user can retry
    } finally {
      setAccepting(false)
    }
  }

  const regeneratePreview = () => {
    const el = roomElRef.current
    if (!el || !preview) return
    el.removeCustomItem(preview.tempId)
    setRegenInput({ ...preview.input, feedback: preview.input.feedback ?? '' })
    setPreview(null)
    setAddOpen(true)
  }

  const cancelPreview = () => {
    const el = roomElRef.current
    if (el && preview) el.removeCustomItem(preview.tempId)
    setPreview(null)
  }

  const deleteSelected = async () => {
    const el = roomElRef.current
    if (!el || !selected?.custom) return
    const itemId = selected.id.replace(/^custom:/, '')
    el.removeCustomItem(selected.id)
    setSelected(null)
    takeSnapshot()
    refreshMovables()
    fetch(`/api/dorm/items?id=${encodeURIComponent(itemId)}`, { method: 'DELETE' }).catch(() => {})
  }

  const storeSelected = () => {
    if (!selected) return
    roomElRef.current?.storeItem(selected.id)
    setStorageOpen(true)
  }

  const restoreFromStorage = (id: string) => {
    roomElRef.current?.restoreItem(id)
  }

  const night = room.mode === 'night'

  const zoomButton = cn(
    'h-11 w-11 rounded-xl border font-mono text-2xl leading-none shadow-[0_2px_8px_rgba(44,31,14,0.14)] transition-colors duration-200',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
    night
      ? 'border-[#4A3D2A] bg-[#221A12] text-[#F5F0E8] hover:bg-gold hover:text-textPrimary'
      : 'border-grid bg-surface text-textPrimary hover:bg-gold'
  )

  return (
    <div
      className={cn(
        'relative flex min-h-[420px] flex-1 overflow-hidden rounded-2xl border transition-colors duration-300',
        night
          ? 'border-[#4A3D2A] bg-[#14100C] text-[#F5F0E8]'
          : 'border-grid bg-beige text-textPrimary'
      )}
    >
      <div
        ref={stageRef}
        role="img"
        aria-label={STAGE_ARIA_LABEL}
        className="relative min-w-0 flex-1"
      >
        <DormStage onElement={handleElement} />

        {editMode && (
          <EditBanner
            night={night}
            selected={selected}
            preview={preview ? { name: preview.input.name } : null}
            saving={saving}
            accepting={accepting}
            storedItems={movables.filter((m) => m.stored)}
            storageOpen={storageOpen}
            onToggleStorage={() => setStorageOpen((open) => !open)}
            onRestoreItem={restoreFromStorage}
            onStoreItem={storeSelected}
            onAddItem={() => {
              setRegenInput(null)
              setAddOpen(true)
            }}
            onDone={requestEditExit}
            onRotate={(deg) => selected && roomElRef.current?.rotateItem(selected.id, deg)}
            onResetItem={() => selected && roomElRef.current?.resetItem(selected.id)}
            onDeleteItem={deleteSelected}
            onDeselect={() => roomElRef.current?.clearSelection()}
            onAcceptPreview={acceptPreview}
            onRegeneratePreview={regeneratePreview}
            onCancelPreview={cancelPreview}
          />
        )}

        {walkMode && (
          <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-goldLight bg-[#2C1F0E]/80 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-beige">
            WASD move · Mouse look · Space jump · Esc exit
          </p>
        )}

        {!walkMode && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => roomElRef.current?.zoomBy(0.8)}
            aria-label="Zoom in"
            className={zoomButton}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => roomElRef.current?.zoomBy(1.25)}
            aria-label="Zoom out"
            className={zoomButton}
          >
            &minus;
          </button>
        </div>
        )}

        {isMobile && !panelOpen && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-label="Show controls"
            className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-goldLight bg-gold px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-textPrimary shadow-[0_2px_8px_rgba(44,31,14,0.18)]"
          >
            Controls
          </button>
        )}

        {!isMobile && !editMode && !walkMode && (
          <p className="pointer-events-none absolute bottom-3.5 left-4 font-mono text-[10px] uppercase tracking-[0.22em] text-textMuted">
            Drag to orbit · Scroll to zoom · Click objects
          </p>
        )}
      </div>

      <RoomPanel
        room={room}
        night={night}
        interact={walkMode ? 'walk' : editMode ? 'edit' : 'view'}
        showWalk={!isMobile}
        autoSpin={autoSpin}
        isMobile={isMobile}
        panelOpen={panelOpen}
        onSend={send}
        onInteract={handleInteract}
        onToggleAutoSpin={handleAutoSpin}
        onResetView={() => roomElRef.current?.resetView()}
        onResetLayout={handleResetLayout}
        onTogglePanel={() => setPanelOpen((open) => !open)}
      />

      <AddItemDialog
        open={addOpen}
        night={night}
        initial={regenInput}
        onClose={() => {
          setAddOpen(false)
          setRegenInput(null)
        }}
        onGenerated={handleGenerated}
      />

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#2C1F0E]/50" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Save layout changes"
            className={cn(
              'relative w-full max-w-sm rounded-2xl border p-5 shadow-[0_12px_40px_rgba(44,31,14,0.35)]',
              night ? 'border-[#4A3D2A] bg-[#221A12] text-[#F5F0E8]' : 'border-goldLight bg-surface text-textPrimary'
            )}
          >
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-textMuted">
              Leaving edit mode
            </p>
            <p className="mt-2 font-inter text-sm leading-relaxed">
              You moved things around. Save this layout?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmSave}
                disabled={saving}
                className="rounded-lg bg-gold py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-textPrimary transition-colors duration-200 hover:bg-brownAccent hover:text-beige disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                disabled={saving}
                className={cn(
                  'rounded-lg border py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors duration-200',
                  night
                    ? 'border-[#4A3D2A] text-[#F5F0E8] hover:border-gold hover:text-gold'
                    : 'border-grid text-textPrimary hover:border-gold hover:text-gold'
                )}
              >
                Discard changes
              </button>
              <button
                type="button"
                onClick={() => {
                  pendingWalkRef.current = false
                  setConfirmOpen(false)
                }}
                disabled={saving}
                className="py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted transition-colors duration-200 hover:text-gold"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
