'use client'

import { RECURRENCE_PRESETS } from '@/lib/todo/recurrence'

// Compact recurrence picker: a preset (or none/custom) + regenerate-on-complete.
// Emits a plain RRULE string (or null when "Does not repeat").
export interface RecurrenceValue {
  rrule: string | null
  regenerateOnComplete: boolean
}

export default function RecurrenceEditor({
  value,
  onChange,
}: {
  value: RecurrenceValue
  onChange: (v: RecurrenceValue) => void
}) {
  const isCustom = value.rrule !== null && !RECURRENCE_PRESETS.some(p => p.rrule === value.rrule)

  return (
    <div className="flex flex-col gap-2">
      <label className="font-mono text-[10px] tracking-[1.5px]" style={{ color: 'var(--iven-muted)' }}>
        REPEAT
      </label>
      <select
        value={value.rrule === null ? 'none' : isCustom ? 'custom' : value.rrule}
        onChange={e => {
          const v = e.target.value
          if (v === 'none') onChange({ ...value, rrule: null })
          else if (v === 'custom') onChange({ ...value, rrule: value.rrule ?? 'FREQ=DAILY' })
          else onChange({ ...value, rrule: v })
        }}
        className="rounded-lg px-3 py-2 text-[13px] font-inter outline-none"
        style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
      >
        <option value="none">Does not repeat</option>
        {RECURRENCE_PRESETS.map(p => (
          <option key={p.id} value={p.rrule}>
            {p.label}
          </option>
        ))}
        <option value="custom">Custom RRULE…</option>
      </select>

      {isCustom && (
        <input
          value={value.rrule ?? ''}
          onChange={e => onChange({ ...value, rrule: e.target.value })}
          placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
          className="rounded-lg px-3 py-2 text-[13px] font-mono outline-none"
          style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-border)', color: 'var(--iven-text)' }}
        />
      )}

      {value.rrule !== null && (
        <label className="flex items-center gap-2 text-[12px] font-inter cursor-pointer" style={{ color: 'var(--iven-muted)' }}>
          <input
            type="checkbox"
            checked={value.regenerateOnComplete}
            onChange={e => onChange({ ...value, regenerateOnComplete: e.target.checked })}
          />
          Regenerate next instance on complete
        </label>
      )}
    </div>
  )
}
