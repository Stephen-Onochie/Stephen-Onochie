'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import IvenModule from '@/components/iven/IvenModule'
import { createClient } from '@/lib/supabase/client'
import {
  fetchApplications,
  fetchContacts,
  fetchInterviews,
  fetchTasks,
  fetchWeeklyGoals,
  fetchSettings,
} from '@/lib/internship/supabase'
import type {
  Application,
  Contact,
  Interview,
  Task,
  WeeklyGoal,
  InternshipSettings,
} from '@/types/internship'
import Board from '@/components/internship/Board'
import FilterBar, { EMPTY_FILTERS, type Filters } from '@/components/internship/FilterBar'
import QuickAddDialog from '@/components/internship/QuickAddDialog'
import ApplicationDetail from '@/components/internship/ApplicationDetail'
import ContactsPipeline from '@/components/internship/ContactsPipeline'
import ContactDialog from '@/components/internship/ContactDialog'
import InterviewsView from '@/components/internship/InterviewsView'
import Dashboard from '@/components/internship/Dashboard'
import ReminderBanners from '@/components/internship/ReminderBanners'
import SettingsPanel from '@/components/internship/SettingsPanel'
import { Button } from '@/components/internship/ui'

type Tab = 'board' | 'contacts' | 'interviews' | 'dashboard' | 'settings'
const TABS: { key: Tab; label: string }[] = [
  { key: 'board', label: 'Board' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'settings', label: 'Settings' },
]

function InternshipTracker() {
  const searchParams = useSearchParams()

  const [tab, setTab] = useState<Tab>('board')
  const [loading, setLoading] = useState(true)

  const [applications, setApplications] = useState<Application[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([])
  const [settings, setSettings] = useState<InternshipSettings | null>(null)

  // Board UI state
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'board' | 'table'>('board')

  // Dialog state
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddUrl, setQuickAddUrl] = useState<string | undefined>()
  const [detailApp, setDetailApp] = useState<Application | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [contactDialog, setContactDialog] = useState<Contact | null>(null)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return
    const [apps, cts, ivs, tks, goals, st] = await Promise.all([
      fetchApplications(supabase),
      fetchContacts(supabase),
      fetchInterviews(supabase),
      fetchTasks(supabase),
      fetchWeeklyGoals(supabase),
      fetchSettings(supabase),
    ])
    setApplications(apps)
    setContacts(cts)
    setInterviews(ivs)
    setTasks(tks)
    setWeeklyGoals(goals)
    setSettings(st)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Bookmarklet entry: /apps/internship?add=<url> opens quick-add prefilled.
  useEffect(() => {
    const addUrl = searchParams.get('add')
    if (addUrl) {
      setQuickAddUrl(addUrl)
      setQuickAddOpen(true)
    }
  }, [searchParams])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return applications.filter(a => {
      if (filters.lane !== 'all' && a.lane !== filters.lane) return false
      if (filters.city !== 'all' && a.city_tag !== filters.city) return false
      if (filters.roleType !== 'all' && a.role_type !== filters.roleType) return false
      if (filters.priority !== 'all' && a.priority !== filters.priority) return false
      if (filters.referral !== 'all' && a.referral_status !== filters.referral) return false
      if (filters.paidOnly && a.is_paid_confirmed) return false
      if (q && !a.company.toLowerCase().includes(q) && !a.role_title.toLowerCase().includes(q)) return false
      return true
    })
  }, [applications, filters, search])

  function openApp(a: Application) {
    setDetailApp(a)
    setDetailOpen(true)
  }

  function openContact(c: Contact) {
    setContactDialog(c)
    setContactDialogOpen(true)
  }

  function patchApp(updated: Application) {
    setApplications(prev => prev.map(a => (a.id === updated.id ? updated : a)))
    setDetailApp(updated)
  }

  return (
    <IvenModule
      index={11}
      title="Internship Tracker"
      right={
        <Button
          onClick={() => {
            setQuickAddUrl(undefined)
            setQuickAddOpen(true)
          }}
        >
          <span className="flex items-center gap-1.5">
            <Plus size={13} /> Add Application
          </span>
        </Button>
      }
    >
      {/* Internal tab bar */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid var(--iven-grid)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="font-mono text-[11px] font-semibold tracking-[1.5px] uppercase px-4 py-2.5 transition-colors"
            style={{
              color: tab === t.key ? 'var(--iven-text)' : 'var(--iven-muted)',
              borderBottom: `2px solid ${tab === t.key ? 'var(--iven-accent)' : 'transparent'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="iven-indeterminate-track" />
      ) : (
        <>
          {tab === 'board' && (
            <>
              <ReminderBanners
                applications={applications}
                contacts={contacts}
                interviews={interviews}
                tasks={tasks}
                weeklyGoals={weeklyGoals}
              />
              <FilterBar
                filters={filters}
                onChange={setFilters}
                search={search}
                onSearch={setSearch}
                view={view}
                onView={setView}
              />
              <Board
                applications={filtered}
                onChange={next => {
                  // Board hands back the full (filtered) set with one card moved;
                  // merge those changes into the master list by id.
                  setApplications(prev =>
                    prev.map(a => next.find(n => n.id === a.id) ?? a)
                  )
                }}
                onOpen={openApp}
                view={view}
              />
            </>
          )}

          {tab === 'contacts' && (
            <ContactsPipeline
              contacts={contacts}
              onChange={setContacts}
              onOpen={openContact}
              onAdd={() => {
                setContactDialog(null)
                setContactDialogOpen(true)
              }}
            />
          )}

          {tab === 'interviews' && (
            <InterviewsView interviews={interviews} applications={applications} onOpenApp={openApp} />
          )}

          {tab === 'dashboard' && (
            <Dashboard
              applications={applications}
              contacts={contacts}
              interviews={interviews}
              tasks={tasks}
              weeklyGoals={weeklyGoals}
              onOpenApp={openApp}
              onOpenContact={openContact}
            />
          )}

          {tab === 'settings' && settings && (
            <SettingsPanel
              settings={settings}
              weeklyGoals={weeklyGoals}
              onSettingsChange={setSettings}
              onGoalsChange={setWeeklyGoals}
            />
          )}
        </>
      )}

      {/* Dialogs */}
      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={app => setApplications(prev => [app, ...prev])}
        initialUrl={quickAddUrl}
      />
      <ApplicationDetail
        application={detailApp}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChange={patchApp}
        onDeleted={id => setApplications(prev => prev.filter(a => a.id !== id))}
      />
      <ContactDialog
        contact={contactDialog}
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        applications={applications}
        onSaved={c =>
          setContacts(prev => (prev.some(x => x.id === c.id) ? prev.map(x => (x.id === c.id ? c : x)) : [c, ...prev]))
        }
        onDeleted={id => setContacts(prev => prev.filter(c => c.id !== id))}
      />
    </IvenModule>
  )
}

export default function InternshipPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="iven-indeterminate-track" /></div>}>
      <InternshipTracker />
    </Suspense>
  )
}
