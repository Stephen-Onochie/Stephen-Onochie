'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import IvenModule from '@/components/iven/IvenModule'
import {
  ShieldCheck, Users, RefreshCw, Plus, Trash2, KeyRound, Loader2, Check, X,
} from 'lucide-react'

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

const KEY_STORE = 'ojis.adminKey'

function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${Math.floor(s)}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

export default function OjisAdminPage() {
  const supabase = createClient()

  const [adminKey, setAdminKey] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [gateErr, setGateErr] = useState('')
  const [gateBusy, setGateBusy] = useState(false)

  const [tab, setTab] = useState<Tab>('live')
  const [status, setStatus] = useState<Status | null>(null)
  const [tables, setTables] = useState<TableFill[]>([])
  const [recent, setRecent] = useState<Recent[]>([])
  const [guards, setGuards] = useState<Guard[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  const flash = useCallback((ok: boolean, msg: string) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const rpc = useCallback(
    async (fn: string, args: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc(fn, args)
      if (error) throw new Error(error.message)
      return data as Record<string, unknown>
    },
    [supabase]
  )

  /* ---------- data ---------- */

  const loadAll = useCallback(
    async (key: string) => {
      setRefreshing(true)
      try {
        const s = (await rpc('ojis_admin_status', { p_admin_key: key })) as unknown as Status & { result: string }
        if (s.result !== 'OK') {
          setUnlocked(false)
          sessionStorage.removeItem(KEY_STORE)
          return
        }
        setStatus(s)

        const d = (await rpc('ojis_dashboard', { p_event_code: s.event_code })) as {
          result: string; tables?: TableFill[]; recent?: Recent[]
        }
        if (d.result === 'OK') {
          setTables(d.tables ?? [])
          setRecent(d.recent ?? [])
        }

        const g = (await rpc('ojis_guards_list', { p_admin_key: key })) as { result: string; guards?: Guard[] }
        if (g.result === 'OK') setGuards(g.guards ?? [])
      } catch (e) {
        flash(false, e instanceof Error ? e.message : 'Could not reach the event database.')
      } finally {
        setRefreshing(false)
      }
    },
    [rpc, flash]
  )

  // Resume a session without retyping the key.
  useEffect(() => {
    const saved = sessionStorage.getItem(KEY_STORE)
    if (!saved) return
    setAdminKey(saved)
    setUnlocked(true)
    loadAll(saved)
  }, [loadAll])

  // Live refresh while the Live tab is open.
  useEffect(() => {
    if (!unlocked || tab !== 'live') return
    const t = setInterval(() => loadAll(adminKey), 15000)
    return () => clearInterval(t)
  }, [unlocked, tab, adminKey, loadAll])

  async function submitKey(e: React.FormEvent) {
    e.preventDefault()
    setGateBusy(true)
    setGateErr('')
    try {
      const s = (await rpc('ojis_admin_status', { p_admin_key: adminKey })) as { result: string }
      if (s.result !== 'OK') {
        setGateErr('That admin key is not right.')
        return
      }
      sessionStorage.setItem(KEY_STORE, adminKey)
      setUnlocked(true)
      await loadAll(adminKey)
    } catch {
      setGateErr('Could not reach the event database.')
    } finally {
      setGateBusy(false)
    }
  }

  /* ---------- gate ---------- */

  if (!unlocked) {
    return (
      <IvenModule index={15} title="Ojis @ 50">
        <form onSubmit={submitKey} className="max-w-sm w-full">
          <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--iven-muted)' }}>
            <KeyRound size={16} />
            <span className="font-mono text-[10px] tracking-[2px] font-semibold uppercase">Admin key</span>
          </div>
          <input
            type="password"
            value={adminKey}
            autoComplete="off"
            onChange={e => setAdminKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg font-inter text-sm outline-none"
            style={{
              background: 'var(--iven-surface)',
              border: '1px solid var(--iven-border)',
              color: 'var(--iven-text)',
            }}
          />
          {gateErr && <p className="font-inter text-xs mt-2" style={{ color: '#c0392b' }}>{gateErr}</p>}
          <button
            type="submit"
            disabled={gateBusy || !adminKey}
            className="mt-4 px-4 py-2 rounded-lg font-mono text-[10px] tracking-[2px] font-semibold uppercase inline-flex items-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--iven-accent)', color: '#2C1F0E', border: 'none', cursor: 'pointer' }}
          >
            {gateBusy && <Loader2 size={13} className="animate-spin" />}
            Unlock
          </button>
        </form>
      </IvenModule>
    )
  }

  /* ---------- shell ---------- */

  const pct = status && status.total_guests > 0
    ? Math.round((status.checked_in / status.total_guests) * 100)
    : 0

  return (
    <IvenModule
      index={15}
      title={status?.event_name ?? 'Ojis @ 50'}
      right={
        <button
          onClick={() => loadAll(adminKey)}
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

      {tab === 'live' && (
        <LiveTab status={status} pct={pct} tables={tables} recent={recent} />
      )}

      {tab === 'guards' && (
        <GuardsTab
          guards={guards}
          adminKey={adminKey}
          rpc={rpc}
          flash={flash}
          reload={() => loadAll(adminKey)}
        />
      )}

      {tab === 'security' && (
        <SecurityTab
          status={status}
          adminKey={adminKey}
          rpc={rpc}
          flash={flash}
          reload={() => loadAll(adminKey)}
          onKeyChanged={k => { setAdminKey(k); sessionStorage.setItem(KEY_STORE, k) }}
        />
      )}
    </IvenModule>
  )
}

/* ================= Live ================= */

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
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
          <p className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>
            Nobody has checked in yet.
          </p>
        ) : (
          <div className="flex flex-col">
            {recent.map((r, i) => (
              <div
                key={`${r.guest_name}-${i}`}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid var(--iven-grid)' }}
              >
                <div>
                  <div className="font-inter text-sm" style={{ color: 'var(--iven-text)' }}>{r.guest_name}</div>
                  <div className="font-mono text-[10px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
                    {r.table_number === 'VIP' ? 'VIP' : `Table ${r.table_number}`}
                    {r.checked_in_by ? ` · ${r.checked_in_by}` : ''}
                  </div>
                </div>
                <div className="font-mono text-[10px]" style={{ color: 'var(--iven-muted)' }}>
                  {timeAgo(r.checked_in_at)}
                </div>
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

function GuardsTab({
  guards, adminKey, rpc, flash, reload,
}: {
  guards: Guard[]
  adminKey: string
  rpc: (fn: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>
  flash: (ok: boolean, msg: string) => void
  reload: () => void
}) {
  const [name, setName] = useState('')
  const [post, setPost] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  const messages: Record<string, string> = {
    BAD_NAME: 'Give the guard a name.',
    WEAK_PASSWORD: 'Password needs at least 4 characters.',
    PASSWORD_REQUIRED: 'A new guard needs a password.',
    DUPLICATE_NAME: 'There is already a guard with that name.',
    NOT_FOUND: 'That guard no longer exists.',
    UNAUTHORIZED: 'Admin key rejected.',
  }

  async function call(args: Record<string, unknown>, okMsg: string) {
    setBusy(true)
    try {
      const r = (await rpc('ojis_guard_upsert', { p_admin_key: adminKey, ...args })) as { result: string }
      if (r.result !== 'OK') { flash(false, messages[r.result] ?? r.result); return false }
      flash(true, okMsg)
      reload()
      return true
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'Save failed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const ok = await call(
      { p_id: null, p_name: name, p_post: post, p_password: pw, p_active: true },
      `${name.trim()} added.`
    )
    if (ok) { setName(''); setPost(''); setPw('') }
  }

  async function remove(g: Guard) {
    if (!confirm(`Remove ${g.guard_name}? Their password stops working immediately.`)) return
    try {
      const r = (await rpc('ojis_guard_delete', { p_admin_key: adminKey, p_id: g.id })) as { result: string }
      if (r.result !== 'OK') { flash(false, messages[r.result] ?? r.result); return }
      flash(true, `${g.guard_name} removed.`)
      reload()
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'Delete failed.')
    }
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
          {guards.map(g => (
            <GuardRow key={g.id} g={g} busy={busy} onSave={call} onRemove={() => remove(g)} />
          ))}
        </div>
      )}
    </div>
  )
}

function GuardRow({
  g, busy, onSave, onRemove,
}: {
  g: Guard
  busy: boolean
  onSave: (args: Record<string, unknown>, okMsg: string) => Promise<boolean>
  onRemove: () => void
}) {
  const [newPw, setNewPw] = useState('')

  return (
    <div className="flex flex-wrap items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--iven-grid)' }}>
      <div className="flex-1 min-w-[180px]">
        <div className="font-inter text-sm" style={{ color: 'var(--iven-text)' }}>
          {g.guard_name}
          {!g.active && (
            <span className="ml-2 font-mono text-[9px] tracking-[1.5px] uppercase" style={{ color: '#c0392b' }}>
              disabled
            </span>
          )}
        </div>
        <div className="font-mono text-[10px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
          {g.post || 'no post'} · last used {timeAgo(g.last_used_at)}
        </div>
      </div>

      <input
        value={newPw}
        onChange={e => setNewPw(e.target.value)}
        placeholder="New password"
        autoComplete="new-password"
        className="px-2 py-[6px] rounded-lg font-inter text-xs outline-none"
        style={{ ...inputStyle, width: 150 }}
      />
      <button
        disabled={busy || !newPw}
        onClick={async () => {
          const ok = await onSave(
            { p_id: g.id, p_name: g.guard_name, p_post: g.post ?? '', p_password: newPw, p_active: g.active },
            `${g.guard_name}'s password changed.`
          )
          if (ok) setNewPw('')
        }}
        className="px-3 py-[6px] rounded-lg font-mono text-[9px] tracking-[1.5px] font-semibold uppercase disabled:opacity-40"
        style={{ background: 'transparent', border: '1px solid var(--iven-border)', color: 'var(--iven-text)', cursor: 'pointer' }}
      >
        Set
      </button>
      <button
        disabled={busy}
        onClick={() => onSave(
          { p_id: g.id, p_name: g.guard_name, p_post: g.post ?? '', p_password: '', p_active: !g.active },
          `${g.guard_name} ${g.active ? 'disabled' : 're-enabled'}.`
        )}
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

function SecurityTab({
  status, adminKey, rpc, flash, reload, onKeyChanged,
}: {
  status: Status | null
  adminKey: string
  rpc: (fn: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>
  flash: (ok: boolean, msg: string) => void
  reload: () => void
  onKeyChanged: (k: string) => void
}) {
  const [doorPw, setDoorPw] = useState('')
  const [code, setCode] = useState('')
  const [newKey, setNewKey] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn: string, args: Record<string, unknown>, okMsg: string, after?: () => void) {
    setBusy(true)
    try {
      const r = (await rpc(fn, { p_admin_key: adminKey, ...args })) as { result: string }
      if (r.result !== 'OK') { flash(false, r.result.replace(/_/g, ' ').toLowerCase()); return }
      flash(true, okMsg)
      after?.()
      reload()
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'Change failed.')
    } finally {
      setBusy(false)
    }
  }

  const btn = {
    background: 'var(--iven-accent)', color: '#2C1F0E', border: 'none', cursor: 'pointer',
  } as const

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
          <button disabled={busy || doorPw.length < 6} onClick={() => run('ojis_set_password', { p_new_password: doorPw }, 'Door password changed.', () => setDoorPw(''))}
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
          <button disabled={busy || !/^\d{4,8}$/.test(code)} onClick={() => run('ojis_set_event_code', { p_new_code: code }, 'Event code rotated.', () => setCode(''))}
            className="px-4 py-2 rounded-lg font-mono text-[10px] tracking-[2px] font-semibold uppercase disabled:opacity-50" style={btn}>
            Rotate
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-mono text-[10px] tracking-[2px] font-semibold uppercase mb-1 inline-flex items-center gap-2" style={{ color: 'var(--iven-muted)' }}>
          <ShieldCheck size={13} /> Admin key
        </h2>
        <p className="font-inter text-xs mb-2" style={{ color: 'var(--iven-muted)' }}>
          The key for this page. Only you need it.
        </p>
        <div className="flex gap-2">
          <input type="password" value={newKey} onChange={e => setNewKey(e.target.value)} autoComplete="new-password"
            placeholder="At least 8 characters"
            className="flex-1 px-3 py-2 rounded-lg font-inter text-sm outline-none" style={inputStyle} />
          <button disabled={busy || newKey.length < 8}
            onClick={() => run('ojis_set_admin_key', { p_new_key: newKey }, 'Admin key changed.', () => { onKeyChanged(newKey); setNewKey('') })}
            className="px-4 py-2 rounded-lg font-mono text-[10px] tracking-[2px] font-semibold uppercase disabled:opacity-50" style={btn}>
            Change
          </button>
        </div>
      </div>
    </div>
  )
}
