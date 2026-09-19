'use client'

import { useCallback, useEffect, useState } from 'react'
import IvenModule from '@/components/iven/IvenModule'
import { Users, RefreshCw, Plus, Trash2, Check, X } from 'lucide-react'

type Tab = 'live' | 'guards' | 'security'

interface Guard {
  id: number
  guard_name: string
  post: string | null
  active: boolean
  has_password: boolean
  last_used_at: string | null
}

interface Status {
  event_name: string
  event_code: string
  total_guests: number
  checked_in: number
  doors_open_at: string
  password_updated_at: string | null
  failed_unlocks_1h: number
}

interface TableFill { table_number: string; table_side: string; seats: number; arrived: number }
interface Recent { guest_name: string; table_number: string; checked_in_at: string; checked_in_by: string | null }

function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${Math.floor(s)}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

/** Every call is authorized by the session cookie on the server. */
async function api(body?: Record<string, unknown>) {
  const res = await fetch('/api/ojis', body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { cache: 'no-store' })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export default function OjisAdminPage() {
  const [tab, setTab] = useState<Tab>('live')
  const [status, setStatus] = useState<Status | null>(null)
  const [tables, setTables] = useState<TableFill[]>([])
  const [recent, setRecent] = useState<Recent[]>([])
  const [guards, setGuards] = useState<Guard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const flash = useCallback((ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const d = await api()
      setStatus(d.status)
      setTables(d.tables ?? [])
      setRecent(d.recent ?? [])
      setGuards(d.guards ?? [])
      setLoadErr('')
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Could not reach the event database.')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (tab !== 'live') return
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [tab, load])

  const mutate = useCallback(
    async (body: Record<string, unknown>, okMsg: string, messages: Record<string, string> = {}) => {
      try {
        const r = (await api(body)) as { result: string }
        if (r.result !== 'OK') {
          flash(false, messages[r.result] ?? r.result.replace(/_/g, ' ').toLowerCase())
          return false
        }
        flash(true, okMsg)
        await load()
        return true
      } catch (e) {
        flash(false, e instanceof Error ? e.message : 'Change failed.')
        return false
      }
    },
    [flash, load]
  )

  const pct = status && status.total_guests > 0
    ? Math.round((status.checked_in / status.total_guests) * 100)
    : 0

  return (
    <IvenModule
      index={15}
      title={status?.event_name ?? 'Ojis @ 50'}
      right={
        <button
          onClick={load}
          className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[1.5px] font-semibold uppercase"
          style={{ color: 'var(--iven-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : undefined} />
          Refresh
        </button>
      }
    >
      {toast && (
        <div
          className="mb-4 px-3 py-2 rounded-lg font-inter text-xs inline-flex items-center gap-2"
          style={{
            background: toast.ok ? 'color-mix(in srgb, #2e7d32 14%, transparent)' : 'color-mix(in srgb, #c0392b 14%, transparent)',
            color: toast.ok ? '#2e7d32' : '#c0392b',
          }}
        >
          {toast.ok ? <Check size={13} /> : <X size={13} />}
          {toast.msg}
        </div>
      )}

      {loadErr && (
        <div className="mb-4 font-inter text-sm" style={{ color: '#c0392b' }}>
          {loadErr}
        </div>
      )}

      <div className="flex gap-1 mb-6">
        {(['live', 'guards', 'security'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-[6px] rounded-lg font-mono text-[10px] tracking-[1.5px] font-semibold uppercase transition-colors"
            style={{
              background: tab === t ? 'var(--iven-accent)' : 'transparent',
              color: tab === t ? '#2C1F0E' : 'var(--iven-muted)',
              border: '1px solid ' + (tab === t ? 'transparent' : 'var(--iven-border)'),
              cursor: 'pointer',
            }}
          >
            {t === 'live' ? 'Live' : t === 'guards' ? 'Guards' : 'Security'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>Loading…</p>
      ) : (
        <>
          {tab === 'live' && <LiveTab status={status} pct={pct} tables={tables} recent={recent} />}
          {tab === 'guards' && <GuardsTab guards={guards} mutate={mutate} />}
          {tab === 'security' && <SecurityTab status={status} mutate={mutate} />}
        </>
      )}
    </IvenModule>
  )
}

/* ================= Live ================= */

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}>
      <div className="font-mono text-[9px] tracking-[2px] font-semibold uppercase mb-1" style={{ color: 'var(--iven-muted)' }}>
        {label}
      </div>
      <div className="font-playfair font-bold text-[30px] leading-none" style={{ color: 'var(--iven-text)' }}>
        {value}
      </div>
      {sub && <div className="font-inter text-[11px] mt-1" style={{ color: 'var(--iven-muted)' }}>{sub}</div>}
    </div>
  )
}

function LiveTab({
  status, pct, tables, recent,
}: { status: Status | null; pct: number; tables: TableFill[]; recent: Recent[] }) {
  if (!status) return null
  const remaining = status.total_guests - status.checked_in

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Stat label="Checked in" value={status.checked_in} sub={`${pct}% of ${status.total_guests}`} />
        <Stat label="Still out" value={remaining} />
        <Stat label="Tables" value={tables.length} />
        <Stat label="Failed unlocks / 1h" value={status.failed_unlocks_1h} sub={status.failed_unlocks_1h > 0 ? 'worth a look' : 'all quiet'} />
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--iven-grid)' }}>
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: 'var(--iven-accent)' }} />
      </div>

      <div>
        <h2 className="font-mono text-[10px] tracking-[2px] font-semibold uppercase mb-3" style={{ color: 'var(--iven-muted)' }}>
          Table fill
        </h2>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
          {tables.map(t => {
            const full = t.seats > 0 && t.arrived >= t.seats
            return (
              <div
                key={t.table_number}
                className="rounded-lg px-2 py-2 text-center"
                style={{
                  background: full ? 'color-mix(in srgb, var(--iven-accent) 22%, transparent)' : 'var(--iven-surface)',
                  border: '1px solid var(--iven-border)',
                }}
                title={t.table_side}
              >
                <div className="font-mono text-[9px] tracking-[1.5px] font-semibold uppercase" style={{ color: 'var(--iven-muted)' }}>
                  {t.table_number === 'VIP' ? 'VIP' : `Table ${t.table_number}`}
                </div>
                <div className="font-playfair font-bold text-[18px]" style={{ color: 'var(--iven-text)' }}>
                  {t.arrived}<span style={{ color: 'var(--iven-muted)', fontSize: 13 }}>/{t.seats}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="font-mono text-[10px] tracking-[2px] font-semibold uppercase mb-3" style={{ color: 'var(--iven-muted)' }}>
          Latest arrivals
        </h2>
        {recent.length === 0 ? (
          <p className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>Nobody has checked in yet.</p>
        ) : (
          <div className="flex flex-col">
            {recent.map((r, i) => (
              <div key={`${r.guest_name}-${i}`} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--iven-grid)' }}>
                <div>
                  <div className="font-inter text-sm" style={{ color: 'var(--iven-text)' }}>{r.guest_name}</div>
                  <div className="font-mono text-[10px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
                    {r.table_number === 'VIP' ? 'VIP' : `Table ${r.table_number}`}
                    {r.checked_in_by ? ` · ${r.checked_in_by}` : ''}
                  </div>
                </div>
                <div className="font-mono text-[10px]" style={{ color: 'var(--iven-muted)' }}>{timeAgo(r.checked_in_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ================= Guards ================= */

const inputStyle = {
  background: 'var(--iven-bg)',
  border: '1px solid var(--iven-border)',
  color: 'var(--iven-text)',
} as const

const GUARD_MESSAGES: Record<string, string> = {
  BAD_NAME: 'Give the guard a name.',
  WEAK_PASSWORD: 'Password needs at least 4 characters.',
  PASSWORD_REQUIRED: 'A new guard needs a password.',
  DUPLICATE_NAME: 'There is already a guard with that name.',
  NOT_FOUND: 'That guard no longer exists.',
}

type Mutate = (body: Record<string, unknown>, okMsg: string, messages?: Record<string, string>) => Promise<boolean>

function GuardsTab({ guards, mutate }: { guards: Guard[]; mutate: Mutate }) {
  const [name, setName] = useState('')
  const [post, setPost] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const ok = await mutate(
      { action: 'guard_upsert', id: null, name, post, password: pw, active: true },
      `${name.trim()} added.`,
      GUARD_MESSAGES
    )
    setBusy(false)
    if (ok) { setName(''); setPost(''); setPw('') }
  }

  async function remove(g: Guard) {
    if (!confirm(`Remove ${g.guard_name}? Their password stops working immediately.`)) return
    await mutate({ action: 'guard_delete', id: g.id }, `${g.guard_name} removed.`, GUARD_MESSAGES)
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <p className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>
        Each guard gets their own password for the scanner at{' '}
        <span className="font-mono text-[12px]">/checkin.html</span>. The shared door password keeps
        working alongside these, so removing one guard never locks out the rest.
      </p>

      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] tracking-[2px] font-semibold uppercase" style={{ color: 'var(--iven-muted)' }}>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Emeka O."
            className="px-3 py-2 rounded-lg font-inter text-sm outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] tracking-[2px] font-semibold uppercase" style={{ color: 'var(--iven-muted)' }}>Post</span>
          <input value={post} onChange={e => setPost(e.target.value)} placeholder="Main door"
            className="px-3 py-2 rounded-lg font-inter text-sm outline-none" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9px] tracking-[2px] font-semibold uppercase" style={{ color: 'var(--iven-muted)' }}>Password</span>
          <input value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password"
            className="px-3 py-2 rounded-lg font-inter text-sm outline-none" style={inputStyle} />
        </label>
        <button type="submit" disabled={busy}
          className="px-4 py-2 rounded-lg font-mono text-[10px] tracking-[2px] font-semibold uppercase inline-flex items-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--iven-accent)', color: '#2C1F0E', border: 'none', cursor: 'pointer' }}>
          <Plus size={13} /> Add
        </button>
      </form>

      {guards.length === 0 ? (
        <p className="font-inter text-sm inline-flex items-center gap-2" style={{ color: 'var(--iven-muted)' }}>
          <Users size={15} /> No guards yet — everyone shares the door password.
        </p>
      ) : (
        <div className="flex flex-col">
          {guards.map(g => <GuardRow key={g.id} g={g} mutate={mutate} onRemove={() => remove(g)} />)}
        </div>
      )}
    </div>
  )
}

function GuardRow({ g, mutate, onRemove }: { g: Guard; mutate: Mutate; onRemove: () => void }) {
  const [newPw, setNewPw] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(password: string, active: boolean, okMsg: string) {
    setBusy(true)
    const ok = await mutate(
      { action: 'guard_upsert', id: g.id, name: g.guard_name, post: g.post ?? '', password, active },
      okMsg,
      GUARD_MESSAGES
    )
    setBusy(false)
    return ok
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--iven-grid)' }}>
      <div className="flex-1 min-w-[180px]">
        <div className="font-inter text-sm" style={{ color: 'var(--iven-text)' }}>
          {g.guard_name}
          {!g.active && (
            <span className="ml-2 font-mono text-[9px] tracking-[1.5px] uppercase" style={{ color: '#c0392b' }}>disabled</span>
          )}
        </div>
        <div className="font-mono text-[10px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
          {g.post || 'no post'} · last used {timeAgo(g.last_used_at)}
        </div>
      </div>

      <input value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" autoComplete="new-password"
        className="px-2 py-[6px] rounded-lg font-inter text-xs outline-none" style={{ ...inputStyle, width: 150 }} />
      <button
        disabled={busy || !newPw}
        onClick={async () => { if (await save(newPw, g.active, `${g.guard_name}'s password changed.`)) setNewPw('') }}
        className="px-3 py-[6px] rounded-lg font-mono text-[9px] tracking-[1.5px] font-semibold uppercase disabled:opacity-40"
        style={{ background: 'transparent', border: '1px solid var(--iven-border)', color: 'var(--iven-text)', cursor: 'pointer' }}
      >
        Set
      </button>
      <button
        disabled={busy}
        onClick={() => save('', !g.active, `${g.guard_name} ${g.active ? 'disabled' : 're-enabled'}.`)}
        className="px-3 py-[6px] rounded-lg font-mono text-[9px] tracking-[1.5px] font-semibold uppercase disabled:opacity-40"
        style={{ background: 'transparent', border: '1px solid var(--iven-border)', color: 'var(--iven-muted)', cursor: 'pointer' }}
      >
        {g.active ? 'Disable' : 'Enable'}
      </button>
      <button
        onClick={onRemove}
        aria-label={`Remove ${g.guard_name}`}
        className="p-[7px] rounded-lg"
        style={{ background: 'transparent', border: '1px solid var(--iven-border)', color: '#c0392b', cursor: 'pointer' }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

/* ================= Security ================= */

function SecurityTab({ status, mutate }: { status: Status | null; mutate: Mutate }) {
  const [doorPw, setDoorPw] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(body: Record<string, unknown>, okMsg: string, after: () => void) {
    setBusy(true)
    if (await mutate(body, okMsg)) after()
    setBusy(false)
  }

  const btn = { background: 'var(--iven-accent)', color: '#2C1F0E', border: 'none', cursor: 'pointer' } as const

  return (
    <div className="flex flex-col gap-7 max-w-lg">
      <div>
        <h2 className="font-mono text-[10px] tracking-[2px] font-semibold uppercase mb-1" style={{ color: 'var(--iven-muted)' }}>
          Door password
        </h2>
        <p className="font-inter text-xs mb-2" style={{ color: 'var(--iven-muted)' }}>
          Opens both the guard scanner and Mom&apos;s dashboard. Changing it here changes it for both —
          last changed {status?.password_updated_at ? timeAgo(status.password_updated_at) : '—'}.
        </p>
        <div className="flex gap-2">
          <input type="password" value={doorPw} onChange={e => setDoorPw(e.target.value)} autoComplete="new-password"
            placeholder="At least 6 characters"
            className="flex-1 px-3 py-2 rounded-lg font-inter text-sm outline-none" style={inputStyle} />
          <button disabled={busy || doorPw.length < 6}
            onClick={() => run({ action: 'set_password', password: doorPw }, 'Door password changed.', () => setDoorPw(''))}
            className="px-4 py-2 rounded-lg font-mono text-[10px] tracking-[2px] font-semibold uppercase disabled:opacity-50" style={btn}>
            Change
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-mono text-[10px] tracking-[2px] font-semibold uppercase mb-1" style={{ color: 'var(--iven-muted)' }}>
          Event code
        </h2>
        <p className="font-inter text-xs mb-2" style={{ color: 'var(--iven-muted)' }}>
          Internal only — fetched after unlock, never typed by hand. Rotating it signs out every open
          scanner, so avoid doing it once doors are open. Current: <span className="font-mono">{status?.event_code}</span>
        </p>
        <div className="flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" placeholder="6 digits"
            className="flex-1 px-3 py-2 rounded-lg font-inter text-sm outline-none" style={inputStyle} />
          <button disabled={busy || !/^\d{4,8}$/.test(code)}
            onClick={() => run({ action: 'set_event_code', code }, 'Event code rotated.', () => setCode(''))}
            className="px-4 py-2 rounded-lg font-mono text-[10px] tracking-[2px] font-semibold uppercase disabled:opacity-50" style={btn}>
            Rotate
          </button>
        </div>
      </div>
    </div>
  )
}
