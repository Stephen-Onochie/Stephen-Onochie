export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[2px] mb-4"
        style={{ color: 'var(--iven-accent)' }}
      >
        {title}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-mono uppercase tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

export function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[13px] px-3 py-2 rounded outline-none"
      style={{
        background: 'var(--iven-bg)',
        border: '1px solid var(--iven-grid)',
        color: 'var(--iven-text)',
      }}
    />
  )
}
