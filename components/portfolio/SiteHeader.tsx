'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import SoLogo from './SoLogo'
import ThemeToggle from './ThemeToggle'
import SettingsLink from './SettingsLink'

const NAV = [
  { href: '/#work', label: 'Work' },
  { href: '/#silicon', label: 'Silicon' },
  { href: '/#experience', label: 'Experience' },
  { href: '/#contact', label: 'Contact' },
]

export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="sticky top-0 z-50 bg-pf-bg border-b border-pf-line">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12 h-16 flex items-center gap-6">
        <Link
          href="/"
          data-track="header-home"
          className="flex items-center gap-3 text-pf-text hover:text-pf-accent-text transition-colors"
          aria-label="Stephen Onochie, home"
        >
          <SoLogo className="h-7 w-auto" />
          <span className="font-mono text-[12px] font-medium uppercase tracking-[0.22em]">Stephen Onochie</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-7 ml-auto">
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-pf-muted hover:text-pf-text transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <SettingsLink
            field="resumeUrl"
            track="nav-resume"
            className="inline-flex items-center h-8 px-3.5 rounded-md border border-pf-text font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-pf-text hover:bg-pf-text hover:text-pf-bg transition-colors"
          >
            Résumé ↗
          </SettingsLink>
        </div>

        <div className="flex md:hidden items-center gap-2 ml-auto">
          <ThemeToggle compact />
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-pf-line text-pf-text"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Primary" className="md:hidden border-t border-pf-line bg-pf-bg">
          <ul className="px-5 py-2">
            {NAV.map(item => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 border-b border-pf-line font-mono text-[12px] uppercase tracking-[0.18em] text-pf-text"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <SettingsLink
                field="resumeUrl"
                track="nav-resume"
                className="block py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-pf-accent-text"
              >
                Résumé ↗
              </SettingsLink>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
