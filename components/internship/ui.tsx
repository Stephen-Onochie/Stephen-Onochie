'use client'

import type { CSSProperties, ReactNode } from 'react'
import type {
  Lane,
  Priority,
  CityTag,
  ReferralStatus,
} from '@/types/internship'
import { LANE_SHORT, CITY_LABELS } from '@/types/internship'

// Lane → accent color. Stays within the brand palette (golds/browns/greens).
const LANE_COLORS: Record<Lane, string> = {
  lane1_program: '#C9A84C',
  lane2_portal: '#5A7C8C',
  lane3_startup: '#7C8C5A',
}

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#A8743B',
  medium: '#C9A84C',
  low: '#8C7355',
}

export function Pill({
  children,
  color,
  filled,
  style,
}: {
  children: ReactNode
  color?: string
  filled?: boolean
  style?: CSSProperties
}) {
  const c = color ?? 'var(--iven-muted)'
  return (
    <span
      className="inline-flex items-center font-mono text-[9px] font-semibold tracking-[1px] uppercase rounded px-1.5 py-0.5 whitespace-nowrap"
      style={{
        color: filled ? '#2C1F0E' : c,
        background: filled ? c : `color-mix(in srgb, ${c} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${c} 35%, transparent)`,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function LaneBadge({ lane }: { lane: Lane }) {
  return <Pill color={LANE_COLORS[lane]}>{LANE_SHORT[lane]}</Pill>
}

export function CityBadge({ city }: { city: CityTag }) {
  if (city === 'other') return null
  return <Pill color="var(--iven-muted)">{CITY_LABELS[city]}</Pill>
}

export function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span
      title={`${priority} priority`}
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: 8, height: 8, background: PRIORITY_COLORS[priority] }}
    />
  )
}

export function ReferralPill({ status }: { status: ReferralStatus }) {
  if (status === 'none') return null
  const color = status === 'secured' ? '#7C8C5A' : '#A8743B'
  return <Pill color={color}>{status === 'secured' ? 'Ref ✓' : 'Ref ?'}</Pill>
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  style,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  style?: CSSProperties
  title?: string
}) {
  const base: CSSProperties = {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
    border: '1px solid transparent',
  }
  const variants: Record<string, CSSProperties> = {
    primary: { background: 'var(--iven-accent)', color: '#2C1F0E' },
    ghost: {
      background: 'transparent',
      color: 'var(--iven-text)',
      borderColor: 'var(--iven-border)',
    },
    danger: {
      background: 'transparent',
      color: '#A8743B',
      borderColor: 'color-mix(in srgb, #A8743B 40%, transparent)',
    },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="font-mono text-[9px] font-semibold tracking-[1.5px] uppercase"
        style={{ color: 'var(--iven-muted)' }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle: CSSProperties = {
  background: 'var(--iven-bg)',
  border: '1px solid var(--iven-border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--iven-text)',
  width: '100%',
  outline: 'none',
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, resize: 'vertical', minHeight: 60, ...props.style }}
    />
  )
}

export function Select({
  value,
  onChange,
  options,
  style,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  style?: CSSProperties
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, cursor: 'pointer', ...style }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
