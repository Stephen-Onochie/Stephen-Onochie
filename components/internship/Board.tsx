'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Calendar, Flag, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { moveApplicationStage } from '@/lib/internship/supabase'
import type { Application, Stage } from '@/types/internship'
import { STAGES, STAGE_LABELS } from '@/types/internship'
import { daysUntil } from '@/lib/internship/dates'
import { LaneBadge, CityBadge, PriorityDot, ReferralPill } from './ui'

function Card({ app, onOpen, dragging }: { app: Application; onOpen: () => void; dragging?: boolean }) {
  const dl = app.deadline ? daysUntil(app.deadline) : null
  return (
    <div
      onClick={onOpen}
      className="rounded-xl p-3 cursor-pointer transition-shadow select-none"
      style={{
        background: 'var(--iven-surface)',
        border: '1px solid var(--iven-grid)',
        boxShadow: dragging ? '0 12px 28px rgba(20,16,12,0.3)' : 'none',
        opacity: dragging ? 0.95 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <LaneBadge lane={app.lane} />
          <CityBadge city={app.city_tag} />
          <ReferralPill status={app.referral_status} />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!app.is_paid_confirmed && <Flag size={12} style={{ color: '#A8743B' }} />}
          <PriorityDot priority={app.priority} />
        </div>
      </div>
      <div className="text-[14px] font-semibold leading-tight" style={{ color: 'var(--iven-text)' }}>
        {app.company}
      </div>
      <div className="text-[12px] leading-tight mt-0.5" style={{ color: 'var(--iven-muted)' }}>
        {app.role_title}
      </div>
      {dl !== null && (
        <div
          className="flex items-center gap-1 mt-2 font-mono text-[10px] font-semibold"
          style={{ color: dl <= 7 ? '#A8743B' : 'var(--iven-muted)' }}
        >
          <Calendar size={10} />
          {dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`}
        </div>
      )}
    </div>
  )
}

function DraggableCard({ app, onOpen }: { app: Application; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <Card app={app} onOpen={onOpen} />
    </div>
  )
}

function Column({
  stage,
  apps,
  onOpen,
}: {
  stage: Stage
  apps: Application[]
  onOpen: (a: Application) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 268 }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="font-mono text-[10px] font-semibold tracking-[2px] uppercase" style={{ color: 'var(--iven-text)' }}>
          {STAGE_LABELS[stage]}
        </span>
        <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--iven-muted)' }}>
          {apps.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 rounded-xl p-2 flex-1 transition-colors"
        style={{
          background: isOver ? 'color-mix(in srgb, var(--iven-accent) 12%, var(--iven-bg))' : 'var(--iven-bg)',
          border: '1px solid var(--iven-grid)',
          minHeight: 120,
        }}
      >
        {apps.map(a => (
          <DraggableCard key={a.id} app={a} onOpen={() => onOpen(a)} />
        ))}
      </div>
    </div>
  )
}

export default function Board({
  applications,
  onChange,
  onOpen,
  view,
}: {
  applications: Application[]
  onChange: (apps: Application[]) => void
  onOpen: (a: Application) => void
  view: 'board' | 'table'
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const byStage = useMemo(() => {
    const map: Record<Stage, Application[]> = {
      wishlist: [], applied: [], oa: [], interview: [], offer: [], closed: [],
    }
    for (const a of applications) map[a.stage].push(a)
    return map
  }, [applications])

  const activeApp = applications.find(a => a.id === activeId) ?? null

  function handleStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function handleEnd(e: DragEndEvent) {
    setActiveId(null)
    if (!e.over) return
    const toStage = e.over.id as Stage
    const app = applications.find(a => a.id === e.active.id)
    if (!app || app.stage === toStage) return

    // Optimistic update.
    const optimistic = applications.map(a =>
      a.id === app.id
        ? { ...a, stage: toStage, applied_at: toStage === 'applied' && !a.applied_at ? new Date().toISOString() : a.applied_at }
        : a
    )
    onChange(optimistic)

    try {
      const supabase = createClient()
      await moveApplicationStage(supabase, app, toStage)
    } catch {
      onChange(applications) // revert
    }
  }

  if (view === 'table') {
    return <TableView applications={applications} onOpen={onOpen} />
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={handleEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <Column key={stage} stage={stage} apps={byStage[stage]} onOpen={onOpen} />
        ))}
      </div>
      <DragOverlay>{activeApp && <Card app={activeApp} onOpen={() => {}} dragging />}</DragOverlay>
    </DndContext>
  )
}

function TableView({
  applications,
  onOpen,
}: {
  applications: Application[]
  onOpen: (a: Application) => void
}) {
  const [sortKey, setSortKey] = useState<keyof Application>('updated_at')
  const [asc, setAsc] = useState(false)

  const sorted = useMemo(() => {
    const copy = [...applications]
    copy.sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (av < bv) return asc ? -1 : 1
      if (av > bv) return asc ? 1 : -1
      return 0
    })
    return copy
  }, [applications, sortKey, asc])

  function header(key: keyof Application, label: string) {
    return (
      <th
        onClick={() => {
          if (sortKey === key) setAsc(a => !a)
          else { setSortKey(key); setAsc(true) }
        }}
        className="text-left font-mono text-[10px] font-semibold tracking-[1px] uppercase px-3 py-2 cursor-pointer whitespace-nowrap"
        style={{ color: 'var(--iven-muted)' }}
      >
        {label}{sortKey === key ? (asc ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--iven-grid)' }}>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--iven-grid)', background: 'var(--iven-surface)' }}>
            {header('company', 'Company')}
            {header('role_title', 'Role')}
            {header('stage', 'Stage')}
            {header('lane', 'Lane')}
            {header('priority', 'Priority')}
            {header('deadline', 'Deadline')}
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(a => (
            <tr
              key={a.id}
              onClick={() => onOpen(a)}
              className="cursor-pointer transition-colors"
              style={{ borderBottom: '1px solid var(--iven-grid)' }}
            >
              <td className="px-3 py-2.5 text-[13px] font-medium" style={{ color: 'var(--iven-text)' }}>
                <span className="flex items-center gap-1.5">
                  {!a.is_paid_confirmed && <Flag size={11} style={{ color: '#A8743B' }} />}
                  {a.company}
                </span>
              </td>
              <td className="px-3 py-2.5 text-[13px]" style={{ color: 'var(--iven-muted)' }}>{a.role_title}</td>
              <td className="px-3 py-2.5"><span className="text-[12px]" style={{ color: 'var(--iven-text)' }}>{STAGE_LABELS[a.stage]}</span></td>
              <td className="px-3 py-2.5"><LaneBadge lane={a.lane} /></td>
              <td className="px-3 py-2.5"><PriorityDot priority={a.priority} /></td>
              <td className="px-3 py-2.5 text-[12px] font-mono" style={{ color: 'var(--iven-muted)' }}>
                {a.deadline ? `${daysUntil(a.deadline)}d` : '—'}
              </td>
              <td className="px-3 py-2.5">
                {a.job_url ? (
                  <a
                    href={a.job_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[1px] uppercase rounded-md px-2.5 py-1.5 whitespace-nowrap transition-colors"
                    style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}
                    title="Open the application link"
                  >
                    <ExternalLink size={11} /> Apply
                  </a>
                ) : (
                  <span className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
