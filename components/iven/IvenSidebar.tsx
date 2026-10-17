'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, LogOut, Moon, Pencil, RotateCcw, Settings, Sun } from 'lucide-react'
import { useIvenDarkMode } from './IvenDarkModeContext'
import { DEFAULT_NAV_ORDER, HOME_NAV_ITEM, NAV_APPS, type NavItem } from './nav-registry'
import { createClient } from '@/lib/supabase/client'
import { saveSidebarOrder } from '@/lib/iven/preferences'

const NAV_BY_ID = new Map(NAV_APPS.map(item => [item.id, item]))

const lockToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })

interface Tooltip {
  label: string
  top: number
  left: number
}

export default function IvenSidebar({ initialOrder }: { initialOrder: string[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const { dark, toggleDark } = useIvenDarkMode()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const [savedOrder, setSavedOrder] = useState(initialOrder)
  const [draftOrder, setDraftOrder] = useState(initialOrder)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  const order = editing ? draftOrder : savedOrder
  const items = useMemo(
    () => order.map(id => NAV_BY_ID.get(id)).filter((item): item is NavItem => Boolean(item)),
    [order]
  )

  const navRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ top: false, bottom: false })

  const updateFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setFade({
      top: el.scrollTop > 1,
      bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
    })
  }, [])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateFade()
    const observer = new ResizeObserver(updateFade)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateFade, items.length])

  useEffect(() => {
    const active = scrollRef.current?.querySelector<HTMLElement>('[data-nav-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function isActive(href: string) {
    if (href === '/apps') return pathname === '/apps'
    return pathname.startsWith(href)
  }

  function showTooltip(label: string, target: HTMLElement) {
    if (editing) return
    const rect = target.getBoundingClientRect()
    const navRight = navRef.current?.getBoundingClientRect().right ?? rect.right
    setTooltip({ label, top: rect.top + rect.height / 2, left: navRight + 2 })
  }

  function startEditing() {
    setDraftOrder(savedOrder)
    setSaveFailed(false)
    setSettingsOpen(false)
    setTooltip(null)
    setEditing(true)
  }

  const cancelEditing = useCallback(() => {
    setDraftOrder(savedOrder)
    setSaveFailed(false)
    setEditing(false)
  }, [savedOrder])

  async function finishEditing() {
    if (draftOrder.join() === savedOrder.join()) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await saveSidebarOrder(createClient(), draftOrder)
      setSavedOrder(draftOrder)
      setSaveFailed(false)
      setEditing(false)
    } catch {
      setSaveFailed(true)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!editing) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') cancelEditing()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editing, cancelEditing])

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setDraftOrder(current => {
      const from = current.indexOf(String(active.id))
      const to = current.indexOf(String(over.id))
      return arrayMove(current, from, to)
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const fadeMask = `linear-gradient(to bottom, ${fade.top ? 'transparent' : 'black'} 0, black 18px, black calc(100% - 18px), ${fade.bottom ? 'transparent' : 'black'} 100%)`

  return (
    <nav
      ref={navRef}
      className="flex flex-col items-center py-4 flex-shrink-0"
      style={{
        width: 70,
        background: 'var(--iven-surface)',
        borderRight: '1px solid var(--iven-grid)',
        height: '100dvh',
        position: 'sticky',
        top: 0,
        // Elevate the whole sidebar above <main> so flyout labels and the
        // settings popover are never painted over by app content (e.g. grid widgets).
        zIndex: 50,
      }}
    >
      <Link
        href="/"
        className="flex items-center justify-center mb-3"
        style={{ width: 40, height: 40, flexShrink: 0 }}
        aria-label="Back to stephenonochie.com"
        title="Back to stephenonochie.com"
      >
        <Image
          src="/logo-so.png"
          alt="SO"
          width={40}
          height={40}
          className="object-contain opacity-80 hover:opacity-100 transition-opacity"
          priority
        />
      </Link>

      <EditToggle
        editing={editing}
        saving={saving}
        saveFailed={saveFailed}
        onStart={startEditing}
        onFinish={finishEditing}
      />

      <div className="flex flex-col items-center gap-1 mt-3 flex-shrink-0">
        <NavButton
          item={HOME_NAV_ITEM}
          active={isActive(HOME_NAV_ITEM.href)}
          editing={editing}
          onHover={showTooltip}
          onLeave={() => setTooltip(null)}
        />
        <div style={{ width: 28, height: 1, background: 'var(--iven-grid)', margin: '4px 0' }} />
      </div>

      <div
        ref={scrollRef}
        onScroll={() => {
          updateFade()
          setTooltip(null)
        }}
        className="iven-no-scrollbar flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden"
        style={{ maskImage: fadeMask, WebkitMaskImage: fadeMask }}
      >
        <div
          className="flex flex-col items-center gap-1 py-1 mx-auto rounded-xl"
          style={{
            width: 56,
            outline: editing ? '1px dashed var(--iven-accent)' : '1px dashed transparent',
            outlineOffset: -1,
          }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[lockToVerticalAxis]}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {items.map(item => (
                <SortableNavButton
                  key={item.id}
                  item={item}
                  active={isActive(item.href)}
                  editing={editing}
                  onHover={showTooltip}
                  onLeave={() => setTooltip(null)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-1 mt-2 flex-shrink-0">
        {editing ? (
          <button
            onClick={() => setDraftOrder(DEFAULT_NAV_ORDER)}
            className="flex flex-col items-center justify-center gap-1 rounded-[10px] transition-colors"
            style={{ width: 52, height: 40, color: 'var(--iven-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Reset sidebar order to default"
            title="Reset to default order"
          >
            <RotateCcw size={15} strokeWidth={1.7} />
            <span className="font-mono text-[8px] font-semibold tracking-[1.2px]">RESET</span>
          </button>
        ) : (
          <>
            {settingsOpen && (
              <div
                className="absolute bottom-0 left-[calc(100%+8px)] rounded-xl p-2 flex flex-col gap-1 z-30"
                style={{
                  background: 'var(--iven-surface)',
                  border: '1px solid var(--iven-border)',
                  boxShadow: '0 8px 24px rgba(44,31,14,0.15)',
                  minWidth: 160,
                }}
              >
                <button
                  onClick={toggleDark}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                  style={{ color: 'var(--iven-text)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--iven-accent) 15%, transparent)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {dark ? <Sun size={15} /> : <Moon size={15} />}
                  <span className="font-mono text-[10px] tracking-[1.5px] font-semibold">
                    {dark ? 'LIGHT MODE' : 'DARK MODE'}
                  </span>
                </button>
                <div style={{ height: 1, background: 'var(--iven-grid)', margin: '2px 4px' }} />
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                  style={{ color: 'var(--iven-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--iven-accent) 15%, transparent)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={15} />
                  <span className="font-mono text-[10px] tracking-[1.5px] font-semibold">SIGN OUT</span>
                </button>
              </div>
            )}
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className="flex items-center justify-center rounded-[10px] transition-colors"
              style={{
                width: 40,
                height: 40,
                color: settingsOpen ? 'var(--iven-accent)' : 'var(--iven-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Settings"
            >
              <Settings size={20} strokeWidth={1.6} />
            </button>
          </>
        )}
      </div>

      {/* Fixed-position so the scrolling icon list (overflow clips both axes)
          can't cut the label off. */}
      {tooltip && (
        <div
          className="fixed -translate-y-1/2 whitespace-nowrap px-3 py-[7px] rounded-lg font-mono text-[10px] font-semibold tracking-[1.5px] pointer-events-none"
          style={{
            top: tooltip.top,
            left: tooltip.left,
            background: 'var(--iven-text)',
            color: 'var(--iven-bg)',
            boxShadow: '0 6px 20px rgba(44,31,14,0.22)',
          }}
        >
          {tooltip.label}
        </div>
      )}
    </nav>
  )
}

function EditToggle({
  editing,
  saving,
  saveFailed,
  onStart,
  onFinish,
}: {
  editing: boolean
  saving: boolean
  saveFailed: boolean
  onStart: () => void
  onFinish: () => void
}) {
  const label = saving ? 'SAVING' : saveFailed ? 'RETRY' : editing ? 'DONE' : 'EDIT'
  return (
    <button
      onClick={editing ? onFinish : onStart}
      disabled={saving}
      className="flex items-center justify-center gap-1 rounded-full font-mono text-[9px] font-semibold tracking-[1.4px] transition-colors flex-shrink-0"
      style={{
        width: 54,
        height: 24,
        cursor: saving ? 'wait' : 'pointer',
        border: `1px solid ${editing ? 'var(--iven-accent)' : 'var(--iven-border)'}`,
        background: editing ? 'var(--iven-accent)' : 'transparent',
        color: editing ? '#2C1F0E' : 'var(--iven-text)',
      }}
      aria-label={editing ? 'Save sidebar order' : 'Edit sidebar order'}
      title={editing ? 'Save order (Esc to cancel)' : 'Reorder apps'}
    >
      {editing ? <Check size={11} strokeWidth={2.2} /> : <Pencil size={10} strokeWidth={2} />}
      {label}
    </button>
  )
}

interface NavButtonProps {
  item: NavItem
  active: boolean
  editing: boolean
  onHover: (label: string, target: HTMLElement) => void
  onLeave: () => void
}

function NavButton({
  item,
  active,
  editing,
  onHover,
  onLeave,
  wrapperRef,
  wrapperStyle,
}: NavButtonProps & { wrapperRef?: (node: HTMLElement | null) => void; wrapperStyle?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false)
  const Icon = item.icon
  return (
    <div
      ref={wrapperRef}
      style={wrapperStyle}
      className="relative flex justify-center"
      data-nav-active={active}
      onMouseEnter={e => {
        setHovered(true)
        onHover(item.label, e.currentTarget)
      }}
      onMouseLeave={() => {
        setHovered(false)
        onLeave()
      }}
    >
      {active && <div className="absolute inset-0 rounded-[10px]" style={{ background: 'var(--iven-accent)' }} />}
      <Link
        href={item.href}
        className="relative z-10 flex items-center justify-center rounded-[10px] transition-colors"
        style={{
          width: 44,
          height: 44,
          background: hovered && !active && !editing ? 'color-mix(in srgb, var(--iven-accent) 18%, transparent)' : 'transparent',
          color: active ? '#2C1F0E' : hovered ? 'var(--iven-text)' : 'var(--iven-muted)',
          opacity: editing ? 0.45 : 1,
          pointerEvents: editing ? 'none' : 'auto',
        }}
        aria-label={item.label}
      >
        <Icon size={20} strokeWidth={1.7} />
      </Link>
    </div>
  )
}

function SortableNavButton(props: NavButtonProps) {
  const { item, active, editing } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !editing,
  })
  const Icon = item.icon

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
  }

  if (!editing) return <NavButton {...props} wrapperRef={setNodeRef} wrapperStyle={style} />

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`${item.label}, drag to reorder`}
      className="flex items-center justify-center rounded-[10px] outline-none focus-visible:ring-2"
    >
      <div
        className="flex items-center justify-center rounded-[10px]"
        style={{
          width: 44,
          height: 44,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          background: isDragging
            ? 'var(--iven-surface)'
            : active
              ? 'var(--iven-accent)'
              : 'color-mix(in srgb, var(--iven-accent) 8%, transparent)',
          border: `1px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? 'var(--iven-accent)' : 'var(--iven-border)'}`,
          boxShadow: isDragging ? '0 8px 22px rgba(44,31,14,0.25)' : undefined,
          color: active && !isDragging ? '#2C1F0E' : 'var(--iven-text)',
        }}
      >
        <Icon size={20} strokeWidth={1.7} />
      </div>
    </div>
  )
}
