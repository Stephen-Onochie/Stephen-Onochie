'use client'

import { Search, LayoutGrid, List } from 'lucide-react'
import type { Lane, CityTag, RoleType, Priority, ReferralStatus } from '@/types/internship'
import {
  LANE_LABELS,
  CITY_LABELS,
  ROLE_TYPE_LABELS,
  PRIORITY_LABELS,
  REFERRAL_LABELS,
} from '@/types/internship'

export interface Filters {
  lane: Lane | 'all'
  city: CityTag | 'all'
  roleType: RoleType | 'all'
  priority: Priority | 'all'
  referral: ReferralStatus | 'all'
  paidOnly: boolean
}

export const EMPTY_FILTERS: Filters = {
  lane: 'all',
  city: 'all',
  roleType: 'all',
  priority: 'all',
  referral: 'all',
  paidOnly: false,
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: T | 'all'
  onChange: (v: T | 'all') => void
  options: Record<string, string>
  allLabel: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T | 'all')}
      className="font-mono text-[10px] font-semibold tracking-[1px] uppercase rounded-lg px-2.5 py-1.5 cursor-pointer"
      style={{
        background: value === 'all' ? 'var(--iven-bg)' : 'color-mix(in srgb, var(--iven-accent) 14%, var(--iven-bg))',
        border: '1px solid var(--iven-border)',
        color: 'var(--iven-text)',
        outline: 'none',
      }}
    >
      <option value="all">{allLabel}</option>
      {Object.entries(options).map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </select>
  )
}

export default function FilterBar({
  filters,
  onChange,
  search,
  onSearch,
  view,
  onView,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  search: string
  onSearch: (s: string) => void
  view: 'board' | 'table'
  onView: (v: 'board' | 'table') => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5"
        style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)' }}
      >
        <Search size={14} style={{ color: 'var(--iven-muted)' }} />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search company or role…"
          className="bg-transparent text-[13px] outline-none"
          style={{ color: 'var(--iven-text)', width: 200 }}
        />
      </div>

      <FilterSelect value={filters.lane} onChange={v => onChange({ ...filters, lane: v })} options={LANE_LABELS} allLabel="All Lanes" />
      <FilterSelect value={filters.city} onChange={v => onChange({ ...filters, city: v })} options={CITY_LABELS} allLabel="All Cities" />
      <FilterSelect value={filters.roleType} onChange={v => onChange({ ...filters, roleType: v })} options={ROLE_TYPE_LABELS} allLabel="All Roles" />
      <FilterSelect value={filters.priority} onChange={v => onChange({ ...filters, priority: v })} options={PRIORITY_LABELS} allLabel="All Priority" />
      <FilterSelect value={filters.referral} onChange={v => onChange({ ...filters, referral: v })} options={REFERRAL_LABELS} allLabel="All Referral" />

      <button
        onClick={() => onChange({ ...filters, paidOnly: !filters.paidOnly })}
        className="font-mono text-[10px] font-semibold tracking-[1px] uppercase rounded-lg px-2.5 py-1.5"
        style={{
          background: filters.paidOnly ? 'color-mix(in srgb, #A8743B 18%, var(--iven-bg))' : 'var(--iven-bg)',
          border: '1px solid var(--iven-border)',
          color: filters.paidOnly ? '#A8743B' : 'var(--iven-muted)',
        }}
      >
        ⚑ Unconfirmed Pay
      </button>

      <div className="flex-1" />

      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--iven-border)' }}>
        {(['board', 'table'] as const).map(v => (
          <button
            key={v}
            onClick={() => onView(v)}
            className="px-2.5 py-1.5"
            style={{
              background: view === v ? 'var(--iven-accent)' : 'var(--iven-bg)',
              color: view === v ? '#2C1F0E' : 'var(--iven-muted)',
            }}
            title={v === 'board' ? 'Board view' : 'Table view'}
          >
            {v === 'board' ? <LayoutGrid size={15} /> : <List size={15} />}
          </button>
        ))}
      </div>
    </div>
  )
}
