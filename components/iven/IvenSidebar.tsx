'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Clock,
  CheckSquare,
  Timer,
  Waves,
  Shirt,
  MessageCircle,
  Hourglass,
  Settings,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react'
import { useIvenDarkMode } from './IvenDarkModeContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'HOME', icon: LayoutDashboard, href: '/apps' },
  { label: 'NATIVE CLOCK', icon: Clock, href: '/apps/native-clock' },
  { label: 'TODO', icon: CheckSquare, href: '/apps/todo' },
  { label: 'STANDING TIMER', icon: Timer, href: '/apps/standing-timer' },
  { label: 'PROJECT WAVES', icon: Waves, href: '/apps/waves' },
  { label: 'STYLEMATE', icon: Shirt, href: '/apps/stylemate' },
  { label: 'BUBBLES', icon: MessageCircle, href: '/apps/bubbles' },
  { label: 'FASTTRACK', icon: Hourglass, href: '/apps/fast' },
]

export default function IvenSidebar() {
  const pathname = usePathname()
  const { dark, toggleDark } = useIvenDarkMode()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const router = useRouter()

  function isActive(href: string) {
    if (href === '/apps') return pathname === '/apps'
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav
      className="flex flex-col items-center py-4 gap-1 flex-shrink-0"
      style={{
        width: 70,
        background: 'var(--iven-surface)',
        borderRight: '1px solid var(--iven-grid)',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Brand logo */}
      <div
        className="flex items-center justify-center mb-5 rounded-[10px] font-playfair font-bold text-lg"
        style={{
          width: 40,
          height: 40,
          background: 'var(--iven-accent)',
          color: '#2C1F0E',
          letterSpacing: '-0.5px',
          flexShrink: 0,
        }}
      >
        SO
      </div>

      {/* Nav items */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = isActive(href)
          const hovered = hoveredHref === href
          return (
            <div
              key={href}
              className="relative flex justify-center"
              onMouseEnter={() => setHoveredHref(href)}
              onMouseLeave={() => setHoveredHref(null)}
            >
              {active && (
                <div
                  className="absolute inset-0 rounded-[10px]"
                  style={{ background: 'var(--iven-accent)' }}
                />
              )}
              <Link
                href={href}
                className="relative z-10 flex items-center justify-center rounded-[10px] transition-colors"
                style={{
                  width: 44,
                  height: 44,
                  background: hovered && !active ? 'color-mix(in srgb, var(--iven-accent) 18%, transparent)' : 'transparent',
                  border: '1px solid transparent',
                  color: active ? '#2C1F0E' : hovered ? 'var(--iven-text)' : 'var(--iven-muted)',
                }}
                aria-label={label}
              >
                <Icon size={20} strokeWidth={1.7} />
              </Link>
              {hovered && (
                <div
                  className="absolute left-[58px] top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-[7px] rounded-lg z-20 font-mono text-[10px] font-semibold tracking-[1.5px] pointer-events-none"
                  style={{
                    background: 'var(--iven-text)',
                    color: 'var(--iven-bg)',
                    boxShadow: '0 6px 20px rgba(44,31,14,0.22)',
                  }}
                >
                  {label}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom: settings popover */}
      <div className="relative flex flex-col items-center gap-1">
        {settingsOpen && (
          <div
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-xl p-2 flex flex-col gap-1 z-30"
            style={{
              background: 'var(--iven-surface)',
              border: '1px solid var(--iven-border)',
              boxShadow: '0 8px 24px rgba(44,31,14,0.15)',
              minWidth: 160,
            }}
          >
            <button
              onClick={toggleDark}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
              style={{ color: 'var(--iven-text)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--iven-accent) 15%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
              <span className="font-mono text-[10px] tracking-[1.5px] font-semibold">
                {dark ? 'LIGHT MODE' : 'DARK MODE'}
              </span>
            </button>
            <div style={{ height: 1, background: 'var(--iven-grid)', margin: '2px 4px' }} />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
              style={{ color: 'var(--iven-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--iven-accent) 15%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut size={15} />
              <span className="font-mono text-[10px] tracking-[1.5px] font-semibold">SIGN OUT</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setSettingsOpen(o => !o)}
          className="flex items-center justify-center rounded-[10px] transition-colors"
          style={{
            width: 40,
            height: 40,
            color: settingsOpen ? 'var(--iven-accent)' : 'var(--iven-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Settings"
        >
          <Settings size={20} strokeWidth={1.6} />
        </button>
      </div>
    </nav>
  )
}
