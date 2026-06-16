interface IvenModuleProps {
  index: number
  title: string
  right?: React.ReactNode
  children: React.ReactNode
  dark?: boolean
}

export default function IvenModule({ index, title, right, children, dark }: IvenModuleProps) {
  return (
    <div
      data-iven-theme={dark ? 'dark' : undefined}
      className="flex flex-col min-h-full p-8"
      style={dark ? { background: 'var(--iven-bg)', color: 'var(--iven-text)', minHeight: '100%' } : { minHeight: '100%' }}
    >
      <div className="mb-6">
        <div
          className="font-mono text-[10px] font-semibold tracking-[3px] uppercase mb-2"
          style={{ color: 'var(--iven-accent)' }}
        >
          MODULE {String(index).padStart(2, '0')}
        </div>
        <div className="flex items-center gap-5">
          <h1 className="font-playfair font-bold text-[32px] m-0" style={{ color: 'var(--iven-text)' }}>
            {title}
          </h1>
          <div className="flex-1 h-px" style={{ background: 'var(--iven-grid)' }} />
          {right && <div>{right}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}
