'use client'

import { Moon, Sun } from 'lucide-react'

function currentTheme(): 'light' | 'dark' {
  const set = document.documentElement.getAttribute('data-pf-theme')
  if (set === 'light' || set === 'dark') return set
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// The label is pure CSS (.pf-when-*), so server and client render the same
// markup and the button is correct before hydration.
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  function toggle() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-pf-theme', next)
    try {
      localStorage.setItem('pf-theme', next)
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
  }

  const base =
    'items-center gap-1.5 h-8 rounded-full border border-pf-line font-mono text-[11px] uppercase tracking-[0.16em] text-pf-muted hover:text-pf-text hover:border-pf-accent transition-colors'
  const pad = compact ? 'w-8 justify-center' : 'px-3'

  return (
    <button type="button" onClick={toggle} className="inline-flex" aria-label="Toggle light or dark theme">
      <span className={`pf-when-light ${base} ${pad}`}>
        <Moon size={13} aria-hidden="true" />
        {!compact && 'Dark'}
      </span>
      <span className={`pf-when-dark ${base} ${pad}`}>
        <Sun size={13} aria-hidden="true" />
        {!compact && 'Light'}
      </span>
    </button>
  )
}
