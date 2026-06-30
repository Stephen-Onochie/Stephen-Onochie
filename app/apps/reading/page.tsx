'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import IvenModule from '@/components/iven/IvenModule'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Settings, BookOpen, Search, Plus, X, Sparkles, Globe,
  ArrowRight, Loader2,
} from 'lucide-react'
import type {
  ReadingBook, ReadingSession, ReadingSettings, Shelf, BookSearchResult,
} from '@/types/reading'
import { easternDateStr, addDaysToDateStr } from '@/lib/dates'

// ─── Helpers ──────────────────────────────────────────────────────

function todayStr() {
  return easternDateStr(new Date())
}

function formatElapsed(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (hours > 0) return `${pad(hours)}:${pad(mins)}:${pad(secs)}`
  return `${pad(mins)}:${pad(secs)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Streak = consecutive days (ending today or yesterday) with ≥1 finished session.
function computeStreak(dates: string[]): number {
  const set = new Set(dates)
  if (!set.size) return 0
  const todayS = easternDateStr(new Date())
  const yestS = addDaysToDateStr(todayS, -1)
  if (!set.has(todayS) && !set.has(yestS)) return 0

  let streak = 0
  let cursor = set.has(todayS) ? todayS : yestS
  while (set.has(cursor)) {
    streak++
    cursor = addDaysToDateStr(cursor, -1)
  }
  return streak
}

const SHELF_META: { key: Shelf; label: string }[] = [
  { key: 'reading', label: 'Currently Reading' },
  { key: 'want', label: 'Want to Read' },
  { key: 'finished', label: 'Finished' },
]

// ─── Page ─────────────────────────────────────────────────────────

export default function ReadingPage() {
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [settings, setSettings] = useState<ReadingSettings | null>(null)
  const [books, setBooks] = useState<ReadingBook[]>([])
  const [sessions, setSessions] = useState<ReadingSession[]>([])
  const [loading, setLoading] = useState(true)

  const [now, setNow] = useState(() => Date.now())

  // Active session
  const [activeSession, setActiveSession] = useState<ReadingSession | null>(null)
  const [starting, setStarting] = useState(false)
  const [startBookId, setStartBookId] = useState<string>('')
  const [startError, setStartError] = useState('')

  // Stop / notes modal
  const [stopOpen, setStopOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [endPageDraft, setEndPageDraft] = useState('')
  const [savingStop, setSavingStop] = useState(false)

  // Add book
  const [addOpen, setAddOpen] = useState(false)

  // Book detail — store the id, resolve the live row on render so the open
  // drawer re-syncs after loadData() (shelf bubble / public toggle update live).
  const [detailBookId, setDetailBookId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)

    let { data: s } = await supabase
      .from('reading_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    if (!s) {
      const { data: created } = await supabase
        .from('reading_settings')
        .insert({ user_id: session.user.id })
        .select()
        .single()
      s = created
    }
    setSettings(s)

    const { data: bookRows } = await supabase
      .from('reading_books')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
    setBooks((bookRows as ReadingBook[]) ?? [])

    const { data: sessionRows } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('started_at', { ascending: false })
    const all = (sessionRows as ReadingSession[]) ?? []
    setSessions(all)
    setActiveSession(all.find(r => r.ended_at == null) ?? null)

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const booksById = useMemo(() => {
    const m: Record<string, ReadingBook> = {}
    books.forEach(b => { m[b.id] = b })
    return m
  }, [books])

  const activeBook = activeSession ? booksById[activeSession.book_id] : null
  const detailBook = detailBookId ? booksById[detailBookId] ?? null : null

  // Keep the "start" picker pointed at a real book. Re-fire when the current
  // selection no longer exists in the books list (e.g. it was deleted), so a
  // stale id can't be inserted (would fail the book_id foreign key).
  useEffect(() => {
    if (activeSession) return
    if (startBookId && booksById[startBookId]) return
    const firstReading = books.find(b => b.shelf === 'reading') ?? books[0]
    setStartBookId(firstReading?.id ?? '')
  }, [books, booksById, startBookId, activeSession])

  async function startSession() {
    if (starting || activeSession || !userId) return
    const book = booksById[startBookId]
    if (!book) { setStartError('Pick a book to read first.'); return }
    setStarting(true)
    setStartError('')
    const { error } = await supabase.from('reading_sessions').insert({
      user_id: userId,
      book_id: book.id,
      started_at: new Date().toISOString(),
      session_date: todayStr(),
      start_page: book.current_page ?? null,
    })
    if (error) {
      console.error('start session failed:', error)
      setStartError('Could not start the session. Please try again.')
      setStarting(false)
      return
    }
    // Move the book onto the Currently Reading shelf if it isn't already.
    if (book.shelf !== 'reading') {
      await supabase
        .from('reading_books')
        .update({ shelf: 'reading', started_at: book.started_at ?? todayStr(), updated_at: new Date().toISOString() })
        .eq('id', book.id)
    }
    setStarting(false)
    await loadData()
  }

  async function confirmStop() {
    if (!activeSession || savingStop) return
    if (!notesDraft.trim()) return
    setSavingStop(true)

    const endedAt = new Date()
    const minutes = Math.max(
      1,
      Math.round((endedAt.getTime() - new Date(activeSession.started_at).getTime()) / 60000)
    )
    const endPage = endPageDraft.trim() ? parseInt(endPageDraft, 10) : null

    await supabase
      .from('reading_sessions')
      .update({
        ended_at: endedAt.toISOString(),
        minutes,
        end_page: Number.isFinite(endPage as number) ? endPage : null,
        notes: notesDraft.trim(),
      })
      .eq('id', activeSession.id)

    // Advance the book's current page if the user logged one.
    if (endPage != null && Number.isFinite(endPage)) {
      await supabase
        .from('reading_books')
        .update({ current_page: endPage, updated_at: new Date().toISOString() })
        .eq('id', activeSession.book_id)
    }

    setSavingStop(false)
    setStopOpen(false)
    setNotesDraft('')
    setEndPageDraft('')
    await loadData()
  }

  async function moveShelf(book: ReadingBook, shelf: Shelf) {
    const patch: Record<string, unknown> = { shelf, updated_at: new Date().toISOString() }
    if (shelf === 'finished') patch.finished_at = todayStr()
    if (shelf === 'reading' && !book.started_at) patch.started_at = todayStr()
    await supabase.from('reading_books').update(patch).eq('id', book.id)
    await loadData()
  }

  async function setPublicCurrent(book: ReadingBook) {
    if (!userId) return
    const makePublic = !book.is_public_current
    // Unique partial index allows only one — clear the rest first.
    if (makePublic) {
      await supabase
        .from('reading_books')
        .update({ is_public_current: false })
        .eq('user_id', userId)
        .eq('is_public_current', true)
    }
    await supabase
      .from('reading_books')
      .update({ is_public_current: makePublic, updated_at: new Date().toISOString() })
      .eq('id', book.id)
    await loadData()
  }

  async function deleteBook(book: ReadingBook) {
    await supabase.from('reading_books').delete().eq('id', book.id)
    setDetailBookId(null)
    await loadData()
  }

  // ── Today / streak metrics ──
  const finished = sessions.filter(s => s.ended_at && s.minutes)
  const minutesToday = finished
    .filter(s => s.session_date === todayStr())
    .reduce((sum, s) => sum + (s.minutes ?? 0), 0)
  const goal = settings?.daily_goal_minutes ?? 30
  const streak = computeStreak(finished.map(s => s.session_date))
  const totalMinutes = finished.reduce((sum, s) => sum + (s.minutes ?? 0), 0)

  const elapsedSeconds = activeSession
    ? (now - new Date(activeSession.started_at).getTime()) / 1000
    : 0

  if (loading) {
    return (
      <IvenModule index={9} title="Reading">
        <div className="max-w-2xl mx-auto px-4 pt-8 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ background: 'var(--iven-surface)' }} />
          ))}
        </div>
      </IvenModule>
    )
  }

  return (
    <IvenModule
      index={9}
      title="Reading"
      right={
        <Link href="/apps/reading/settings" style={{ color: 'var(--iven-muted)' }} className="hover:opacity-80 transition-opacity">
          <Settings className="w-5 h-5" />
        </Link>
      }
    >
      <div className="max-w-2xl px-4 py-6 space-y-8">

        {/* ── Session timer (hero) ── */}
        <section className="bg-surface rounded-2xl px-6 py-8 flex flex-col items-center">
          {activeSession ? (
            <>
              <div className="font-inter text-xs uppercase tracking-widest text-gold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                Reading
              </div>
              <div className="font-mono text-5xl sm:text-6xl font-bold text-textPrimary tracking-tight tabular-nums">
                {formatElapsed(elapsedSeconds)}
              </div>
              <div className="font-playfair text-lg font-bold text-textPrimary mt-3 text-center">
                {activeBook?.title ?? 'Reading session'}
              </div>
              <div className="w-full bg-beige rounded-full h-2 mt-5">
                <div
                  className="bg-gold h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min((elapsedSeconds / 60 / goal) * 100, 100)}%` }}
                />
              </div>
              <div className="font-inter text-[11px] text-textMuted mt-1.5 self-end">
                {Math.round(elapsedSeconds / 60)} / {goal} min goal
              </div>
              <button
                onClick={() => { setNotesDraft(''); setEndPageDraft(activeBook?.current_page ? String(activeBook.current_page) : ''); setStopOpen(true) }}
                className="mt-6 w-full bg-gold text-white font-inter font-semibold py-3.5 rounded-2xl text-base hover:bg-brownAccent transition-colors"
              >
                End Session
              </button>
            </>
          ) : books.length === 0 ? (
            <>
              <BookOpen className="w-8 h-8 text-gold mb-3" />
              <div className="font-playfair text-xl font-bold text-textPrimary text-center">Add your first book</div>
              <div className="font-inter text-sm text-textMuted mt-1 text-center">
                Search for a title to start tracking your reading.
              </div>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-6 w-full bg-gold text-white font-inter font-semibold py-3.5 rounded-2xl text-base hover:bg-brownAccent transition-colors"
              >
                Add a Book
              </button>
            </>
          ) : (
            <>
              <div className="font-inter text-xs uppercase tracking-widest text-textMuted mb-3">Ready to read</div>
              <select
                value={startBookId}
                onChange={e => setStartBookId(e.target.value)}
                className="w-full font-inter text-sm text-textPrimary bg-beige rounded-xl px-3 py-2.5 border border-grid/30 focus:outline-none focus:border-gold mb-1"
              >
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
              <div className="font-inter text-xs text-textMuted mt-1 text-center">
                {goal}-minute daily goal
              </div>
              <button
                onClick={startSession}
                disabled={starting || !startBookId}
                className="mt-6 w-full bg-gold text-white font-inter font-semibold py-3.5 rounded-2xl text-base hover:bg-brownAccent transition-colors disabled:opacity-60"
              >
                {starting ? 'Starting…' : 'Start Reading Session'}
              </button>
              {startError && (
                <div className="font-inter text-xs text-red-600 mt-3 text-center">{startError}</div>
              )}
            </>
          )}
        </section>

        {/* ── Today / streak metrics ── */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { value: `${minutesToday}`, sub: `/ ${goal} min`, label: 'today' },
            { value: `${streak}`, sub: streak === 1 ? 'day' : 'days', label: 'streak' },
            { value: `${Math.round(totalMinutes / 60)}h`, sub: `${totalMinutes} min`, label: 'all time' },
          ].map(({ value, sub, label }) => (
            <div key={label} className="bg-surface rounded-2xl px-4 py-3.5">
              <div className="font-playfair text-2xl font-bold text-textPrimary leading-none">{value}</div>
              <div className="font-inter text-[11px] text-textMuted mt-1">{sub}</div>
              <div className="font-inter text-[10px] uppercase tracking-widest text-gold mt-2">{label}</div>
            </div>
          ))}
        </section>

        {/* ── Shelves ── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-playfair text-xl font-bold text-textPrimary">My Books</h2>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 font-inter text-sm text-gold hover:text-brownAccent transition-colors"
            >
              <Plus className="w-4 h-4" /> Add book
            </button>
          </div>

          {SHELF_META.map(({ key, label }) => {
            const shelfBooks = books.filter(b => b.shelf === key)
            return (
              <div key={key}>
                <div className="font-inter text-[11px] uppercase tracking-widest text-textMuted mb-2">
                  {label} · {shelfBooks.length}
                </div>
                {shelfBooks.length === 0 ? (
                  <div className="font-inter text-sm text-textMuted/70 italic px-1 py-2">Nothing here yet.</div>
                ) : (
                  <div className="space-y-2">
                    {shelfBooks.map(book => (
                      <BookRow key={book.id} book={book} onOpen={() => setDetailBookId(book.id)} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </div>

      {/* ── Stop / notes modal ── */}
      <Dialog.Root open={stopOpen} onOpenChange={setStopOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-beige border border-gold rounded-2xl p-6 z-[70] w-[min(92vw,440px)] shadow-xl">
            <Dialog.Title className="font-playfair text-2xl font-bold text-textPrimary mb-1">
              End Session
            </Dialog.Title>
            <Dialog.Description className="font-inter text-sm text-textMuted mb-4">
              {Math.round(elapsedSeconds / 60)} min · {activeBook?.title}
            </Dialog.Description>

            <label className="font-inter text-sm font-medium text-textPrimary block mb-2">
              What did you read about? <span className="text-gold">*</span>
            </label>
            <textarea
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              rows={4}
              autoFocus
              className="w-full font-inter text-sm text-textPrimary bg-surface rounded-xl px-3 py-2 border border-grid/30 focus:outline-none focus:border-gold resize-none"
              placeholder="Interesting stories, facts, characters, reflections…"
            />

            {activeBook?.total_pages != null && (
              <div className="mt-3">
                <label className="font-inter text-sm text-textPrimary block mb-1.5">
                  Current page <span className="text-textMuted">(of {activeBook.total_pages})</span>
                </label>
                <input
                  type="number"
                  value={endPageDraft}
                  onChange={e => setEndPageDraft(e.target.value)}
                  className="w-32 font-inter text-sm text-textPrimary bg-surface rounded-lg px-3 py-2 border border-grid/30 focus:outline-none focus:border-gold"
                  placeholder="Page"
                />
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <Dialog.Close asChild>
                <button className="flex-1 py-3 rounded-xl border border-grid/40 text-textMuted font-inter font-medium hover:bg-surface transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={confirmStop}
                disabled={savingStop || !notesDraft.trim()}
                className="flex-1 py-3 bg-gold text-white rounded-xl font-inter font-medium hover:bg-brownAccent transition-colors disabled:opacity-50"
              >
                {savingStop ? 'Saving…' : 'Save Session'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Add book modal ── */}
      <AddBookDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        supabase={supabase}
        onAdded={loadData}
      />

      {/* ── Book detail drawer ── */}
      <BookDetailDrawer
        book={detailBook}
        sessions={detailBook ? sessions.filter(s => s.book_id === detailBook.id && s.ended_at) : []}
        onClose={() => setDetailBookId(null)}
        onMove={moveShelf}
        onTogglePublic={setPublicCurrent}
        onDelete={deleteBook}
      />
    </IvenModule>
  )
}

// ─── Book row ─────────────────────────────────────────────────────

function BookRow({ book, onOpen }: { book: ReadingBook; onOpen: () => void }) {
  const pct = book.total_pages
    ? Math.min(Math.round((book.current_page / book.total_pages) * 100), 100)
    : 0
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 bg-surface rounded-xl p-3 text-left hover:bg-beige transition-colors"
    >
      <div className="w-10 h-14 flex-shrink-0 rounded-md overflow-hidden bg-grid/30 flex items-center justify-center">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="w-4 h-4 text-textMuted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="font-inter text-sm font-medium text-textPrimary truncate">{book.title}</div>
          {book.is_public_current && <Globe className="w-3 h-3 text-gold flex-shrink-0" />}
        </div>
        {book.author && <div className="font-inter text-xs text-textMuted truncate">{book.author}</div>}
        {book.total_pages != null && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 bg-beige rounded-full h-1">
              <div className="bg-gold h-1 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-inter text-[10px] text-textMuted tabular-nums">{pct}%</span>
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Add book dialog ──────────────────────────────────────────────

function AddBookDialog({
  open, onOpenChange, userId, supabase, onAdded,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  userId: string | null
  supabase: ReturnType<typeof createClient>
  onAdded: () => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [picked, setPicked] = useState<BookSearchResult | null>(null)
  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthor, setManualAuthor] = useState('')
  const [manualPages, setManualPages] = useState('')

  function reset() {
    setQuery(''); setResults([]); setPicked(null)
    setManualTitle(''); setManualAuthor(''); setManualPages('')
  }

  async function runSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/reading/book-search?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    }
    setSearching(false)
  }

  async function addBook(result: BookSearchResult, shelf: Shelf) {
    if (!userId || saving) return
    setSaving(true)
    await supabase.from('reading_books').insert({
      user_id: userId,
      title: result.title,
      author: result.author,
      cover_url: result.coverUrl,
      total_pages: result.totalPages,
      shelf,
      started_at: shelf === 'reading' ? todayStr() : null,
    })
    setSaving(false)
    reset()
    onOpenChange(false)
    await onAdded()
  }

  function addManual(shelf: Shelf) {
    if (!manualTitle.trim()) return
    const pages = manualPages.trim() ? parseInt(manualPages, 10) : null
    addBook(
      {
        title: manualTitle.trim(),
        author: manualAuthor.trim() || null,
        coverUrl: null,
        totalPages: Number.isFinite(pages as number) ? pages : null,
      },
      shelf
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-beige border border-gold rounded-2xl p-6 z-[70] w-[min(92vw,480px)] max-h-[85vh] overflow-y-auto shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="font-playfair text-2xl font-bold text-textPrimary">Add a Book</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-textMuted hover:text-textPrimary transition-colors"><X className="w-5 h-5" /></button>
            </Dialog.Close>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              autoFocus
              placeholder="Search by title…"
              className="flex-1 font-inter text-sm text-textPrimary bg-surface rounded-xl px-3 py-2.5 border border-grid/30 focus:outline-none focus:border-gold"
            />
            <button
              onClick={runSearch}
              disabled={searching || !query.trim()}
              className="px-4 bg-gold text-white rounded-xl font-inter text-sm font-medium hover:bg-brownAccent transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2 mb-4">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-xl p-2.5 border transition-colors ${
                    picked === r ? 'border-gold bg-surface' : 'border-grid/20 bg-surface/60'
                  }`}
                >
                  <div className="w-9 h-12 flex-shrink-0 rounded overflow-hidden bg-grid/30 flex items-center justify-center">
                    {r.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.coverUrl} alt={r.title} className="w-full h-full object-cover" />
                    ) : <BookOpen className="w-4 h-4 text-textMuted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-inter text-sm font-medium text-textPrimary truncate">{r.title}</div>
                    {r.author && <div className="font-inter text-xs text-textMuted truncate">{r.author}</div>}
                    {r.totalPages && <div className="font-inter text-[10px] text-textMuted">{r.totalPages} pages</div>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => addBook(r, 'reading')}
                      disabled={saving}
                      className="font-inter text-[11px] text-white bg-gold rounded-md px-2 py-1 hover:bg-brownAccent transition-colors disabled:opacity-60"
                    >
                      Reading
                    </button>
                    <button
                      onClick={() => addBook(r, 'want')}
                      disabled={saving}
                      className="font-inter text-[11px] text-textMuted border border-grid/40 rounded-md px-2 py-1 hover:bg-beige transition-colors disabled:opacity-60"
                    >
                      Want
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual fallback */}
          <details className="mt-2">
            <summary className="font-inter text-xs text-textMuted cursor-pointer hover:text-textPrimary">
              Can&apos;t find it? Add manually
            </summary>
            <div className="mt-3 space-y-2">
              <input
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                placeholder="Title"
                className="w-full font-inter text-sm text-textPrimary bg-surface rounded-lg px-3 py-2 border border-grid/30 focus:outline-none focus:border-gold"
              />
              <input
                value={manualAuthor}
                onChange={e => setManualAuthor(e.target.value)}
                placeholder="Author (optional)"
                className="w-full font-inter text-sm text-textPrimary bg-surface rounded-lg px-3 py-2 border border-grid/30 focus:outline-none focus:border-gold"
              />
              <input
                value={manualPages}
                onChange={e => setManualPages(e.target.value)}
                type="number"
                placeholder="Total pages (optional)"
                className="w-full font-inter text-sm text-textPrimary bg-surface rounded-lg px-3 py-2 border border-grid/30 focus:outline-none focus:border-gold"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => addManual('reading')}
                  disabled={saving || !manualTitle.trim()}
                  className="flex-1 font-inter text-sm text-white bg-gold rounded-lg py-2 hover:bg-brownAccent transition-colors disabled:opacity-50"
                >
                  Add to Reading
                </button>
                <button
                  onClick={() => addManual('want')}
                  disabled={saving || !manualTitle.trim()}
                  className="flex-1 font-inter text-sm text-textMuted border border-grid/40 rounded-lg py-2 hover:bg-surface transition-colors disabled:opacity-50"
                >
                  Want to Read
                </button>
              </div>
            </div>
          </details>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Book detail drawer ───────────────────────────────────────────

function BookDetailDrawer({
  book, sessions, onClose, onMove, onTogglePublic, onDelete,
}: {
  book: ReadingBook | null
  sessions: ReadingSession[]
  onClose: () => void
  onMove: (book: ReadingBook, shelf: Shelf) => Promise<void>
  onTogglePublic: (book: ReadingBook) => Promise<void>
  onDelete: (book: ReadingBook) => Promise<void>
}) {
  const [reflection, setReflection] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // Drag-anywhere: an offset added on top of the centering transform. Starting a
  // drag on an interactive element or inside a scroll region is ignored so
  // buttons, text selection, and scrolling still work.
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  useEffect(() => { setReflection(''); setError(''); setOffset({ x: 0, y: 0 }) }, [book?.id])

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d) return
      setOffset({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) })
    }
    function onUp() { dragRef.current = null }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    const el = e.target as HTMLElement
    if (el.closest('button, a, input, textarea, select, [data-no-drag]')) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y }
  }

  if (!book) return null

  const noteCount = sessions.filter(s => s.notes?.trim()).length

  async function generate() {
    if (!book) return
    setGenerating(true); setError('')
    try {
      const res = await fetch('/api/reading-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Failed to generate.')
      else setReflection(data.reflection || '')
    } catch {
      setError('Failed to generate.')
    }
    setGenerating(false)
  }

  return (
    <Dialog.Root open={!!book} onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          onPointerDown={onPointerDown}
          style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`, touchAction: 'none' }}
          className="fixed top-1/2 left-1/2 bg-beige rounded-2xl p-6 z-[70] w-[min(92vw,560px)] max-h-[88vh] overflow-y-auto shadow-xl cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex gap-3 min-w-0">
              <div className="w-14 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-grid/30 flex items-center justify-center">
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                ) : <BookOpen className="w-5 h-5 text-textMuted" />}
              </div>
              <div className="min-w-0">
                <Dialog.Title className="font-playfair text-xl font-bold text-textPrimary leading-tight">{book.title}</Dialog.Title>
                {book.author && <div className="font-inter text-sm text-textMuted mt-0.5">{book.author}</div>}
                {book.total_pages != null && (
                  <div className="font-inter text-xs text-textMuted mt-1">
                    Page {book.current_page} of {book.total_pages}
                  </div>
                )}
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="text-textMuted hover:text-textPrimary transition-colors flex-shrink-0"><X className="w-5 h-5" /></button>
            </Dialog.Close>
          </div>

          {/* Shelf + public controls */}
          <div className="flex flex-wrap gap-2 mb-5">
            {SHELF_META.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onMove(book, key)}
                className={`font-inter text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  book.shelf === key
                    ? 'bg-gold text-white border-gold'
                    : 'text-textMuted border-grid/40 hover:bg-surface'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => onTogglePublic(book)}
              className={`font-inter text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                book.is_public_current
                  ? 'bg-textPrimary text-white border-textPrimary'
                  : 'text-textMuted border-grid/40 hover:bg-surface'
              }`}
            >
              <Globe className="w-3 h-3" />
              {book.is_public_current ? 'Public' : 'Private'}
            </button>
          </div>

          {/* Reflection */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-playfair text-lg font-bold text-textPrimary">Reflection</h3>
              <button
                onClick={generate}
                disabled={generating || noteCount === 0}
                className="flex items-center gap-1.5 font-inter text-xs text-white bg-gold rounded-lg px-3 py-1.5 hover:bg-brownAccent transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
            {noteCount === 0 && (
              <div className="font-inter text-sm text-textMuted/70 italic">Take session notes first, then generate a reflection.</div>
            )}
            {error && <div className="font-inter text-sm text-red-600">{error}</div>}
            {reflection && (
              <div data-no-drag className="bg-surface rounded-xl p-4 font-inter text-sm text-textPrimary leading-relaxed whitespace-pre-wrap select-text">
                {reflection}
              </div>
            )}
          </div>

          {/* Session notes */}
          <div className="mb-5">
            <h3 className="font-playfair text-lg font-bold text-textPrimary mb-2">Session Notes · {noteCount}</h3>
            {noteCount === 0 ? (
              <div className="font-inter text-sm text-textMuted/70 italic">No notes yet.</div>
            ) : (
              <div data-no-drag className="space-y-2 select-text">
                {sessions.filter(s => s.notes?.trim()).map(s => (
                  <div key={s.id} className="bg-surface rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-inter text-[11px] text-gold">{formatDate(s.started_at)}</span>
                      <span className="font-inter text-[11px] text-textMuted">
                        {s.minutes} min{s.start_page != null && s.end_page != null ? ` · pp. ${s.start_page}–${s.end_page}` : ''}
                      </span>
                    </div>
                    <div className="font-inter text-sm text-textPrimary leading-relaxed whitespace-pre-wrap">{s.notes}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onDelete(book)}
            className="flex items-center gap-1.5 font-inter text-xs text-textMuted hover:text-red-600 transition-colors"
          >
            <ArrowRight className="w-3 h-3" /> Remove book
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
