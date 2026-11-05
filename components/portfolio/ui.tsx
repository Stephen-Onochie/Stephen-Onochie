export const CONTAINER = 'mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12'

export function SectionLabel({ index, children }: { index?: string; children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-pf-faint">
      {index && <span className="text-pf-accent-text">{index} · </span>}
      {children}
    </p>
  )
}

export function SectionTitle({ children, as: Tag = 'h2' }: { children: React.ReactNode; as?: 'h1' | 'h2' }) {
  return (
    <Tag className="font-display uppercase leading-[0.92] tracking-[0.01em] text-pf-text text-[clamp(2.4rem,5.2vw,3.6rem)] mt-2">
      {children}
    </Tag>
  )
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center h-6 px-2.5 rounded-full border border-pf-line font-mono text-[10.5px] text-pf-muted whitespace-nowrap">
      {children}
    </span>
  )
}

export const BTN_PRIMARY =
  'inline-flex items-center justify-center h-11 px-5 rounded-md bg-pf-accent text-pf-on-accent font-medium text-[14px] hover:brightness-110 transition'
export const BTN_SECONDARY =
  'inline-flex items-center justify-center h-11 px-5 rounded-md border border-pf-text text-pf-text font-medium text-[14px] hover:bg-pf-text hover:text-pf-bg transition-colors'
