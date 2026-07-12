'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import RoomPanel from './RoomPanel'

const ROOM_DEFAULTS: DormRoomState = {
  mode: 'day',
  lightsOn: false,
  computerOn: false,
  tvOn: false,
  curtainsOpen: true,
  fansOn: false,
}

const STAGE_ARIA_LABEL =
  "Interactive 3D diorama of Stephen's Wiley Hall dorm room: a cutaway box with a lofted bed and desk by the window, a brown floor sofa lounge facing a TV on a console, a reading nook and a mini-fridge kitchen station in the corners, and closets by the door. Use the Room OS panel controls to toggle lights, computer, TV, curtains, day or night, and auto-spin."

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

export default function RoomExperience() {
  const [room, setRoom] = useState<DormRoomState>(ROOM_DEFAULTS)
  const [editMode, setEditMode] = useState(false)
  const [autoSpin, setAutoSpin] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)

  const stageRef = useRef<HTMLDivElement>(null)
  const roomElRef = useRef<DormRoomElement | null>(null)
  const uiRef = useRef({ editMode: false, autoSpin: false })
  const mobileInitRef = useRef(false)

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const onState = (e: Event) => setRoom((e as CustomEvent<DormRoomState>).detail)
    node.addEventListener('roomstate', onState)
    return () => node.removeEventListener('roomstate', onState)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 859px)')
    const apply = () => {
      setIsMobile(mq.matches)
      // On first entry into mobile widths, collapse the panel so the room is
      // fully visible (matches the prototype's one-time auto-collapse).
      if (mq.matches && !mobileInitRef.current) {
        mobileInitRef.current = true
        setPanelOpen(false)
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const handleElement = useCallback((el: DormRoomElement | null) => {
    roomElRef.current = el
    if (!el) return
    // The engine treats undefined _autoRotate as "spin after 6s idle"; the
    // Auto Spin switch starts off, so the real value must be pushed on mount.
    el._autoRotate = uiRef.current.autoSpin
    el.setEditMode(uiRef.current.editMode)
    setRoom(el.getRoomState())
  }, [])

  const send = (partial: Partial<DormRoomState>) => {
    roomElRef.current?.setRoomState(partial)
  }

  const handleEditMode = (on: boolean) => {
    uiRef.current.editMode = on
    setEditMode(on)
    roomElRef.current?.setEditMode(on)
  }

  const handleAutoSpin = () => {
    const next = !uiRef.current.autoSpin
    uiRef.current.autoSpin = next
    setAutoSpin(next)
    if (roomElRef.current) roomElRef.current._autoRotate = next
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
        'flex h-dvh flex-col overflow-hidden transition-colors duration-300',
        night ? 'bg-[#14100C] text-[#F5F0E8]' : 'bg-beige text-textPrimary'
      )}
    >
      <header className="flex-none px-6 pb-4 pt-5 md:px-7">
        <Link
          href="/playground"
          className="font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-textMuted transition-colors duration-200 hover:text-gold"
        >
          ← Playground / Dorm OS
        </Link>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <h1 className="font-playfair text-3xl font-semibold leading-tight">Dorm OS</h1>
          <p className="font-inter text-sm text-textMuted">
            Stephen&rsquo;s Wiley Hall room · spin it, poke it.
          </p>
        </div>
        <div
          className={cn(
            'mt-4 h-px transition-colors duration-300',
            night ? 'bg-[#4A3D2A]' : 'bg-grid'
          )}
        />
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div
          ref={stageRef}
          role="img"
          aria-label={STAGE_ARIA_LABEL}
          className="relative min-w-0 flex-1"
        >
          <DormStage onElement={handleElement} />

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

          {!isMobile && (
            <p className="pointer-events-none absolute bottom-3.5 left-4 font-mono text-[10px] uppercase tracking-[0.22em] text-textMuted">
              {editMode
                ? 'Edit mode · Drag furniture to rearrange'
                : 'Drag to orbit · Scroll to zoom · Click objects'}
            </p>
          )}
        </div>

        <RoomPanel
          room={room}
          night={night}
          editMode={editMode}
          autoSpin={autoSpin}
          isMobile={isMobile}
          panelOpen={panelOpen}
          onSend={send}
          onSetEditMode={handleEditMode}
          onToggleAutoSpin={handleAutoSpin}
          onResetView={() => roomElRef.current?.resetView()}
          onTogglePanel={() => setPanelOpen((open) => !open)}
        />
      </div>
    </div>
  )
}
