'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/apps/native-clock', label: 'Clock', icon: '🕐', exact: true },
  { href: '/apps/native-clock/tasks', label: 'Tasks', icon: '✅', exact: false },
  { href: '/apps/native-clock/settings', label: 'Settings', icon: '⚙️', exact: false },
]

interface NativeClockNavProps {
  compact?: boolean
}

export default function NativeClockNav({ compact }: NativeClockNavProps) {
  const pathname = usePathname()

  if (compact) {
    return (
      <nav className="flex items-center gap-4" aria-label="Native Clock">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-200"
              style={{ color: active ? 'var(--nc-accent)' : 'var(--nc-muted)' }}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        backgroundColor: 'var(--nc-bg)',
        borderColor: 'var(--nc-border)',
      }}
      aria-label="Native Clock"
    >
      <div className="flex max-w-lg mx-auto">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex-1 flex flex-col items-center justify-center py-3 min-h-[60px] transition-colors duration-150"
              style={{ color: active ? 'var(--nc-accent)' : 'var(--nc-muted)' }}
            >
              <span className="text-xl mb-0.5">{link.icon}</span>
              <span className="text-xs font-inter font-medium">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
