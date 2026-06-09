'use client'

import { useEffect, useState } from 'react'
import { LayoutGrid, Rows3 } from 'lucide-react'
import AppCard from '@/components/apps/AppCard'

type Layout = 'stacked' | 'side-by-side'

const STORAGE_KEY = 'apps-layout'

const apps = [
  {
    name: 'Bubbles',
    description: 'Capture thoughts, ideas, and impulses before they vanish.',
    icon: '💭',
    href: '/apps/bubbles',
  },
  {
    name: 'Standing Timer',
    description: 'Cycle between standing, sitting, and breaks at your desk.',
    icon: '🧍',
    href: '/apps/standing-timer',
  },
  {
    name: 'StyleMate',
    description: 'Catalog your wardrobe and get dressed with less friction.',
    icon: '👔',
    href: '/apps/stylemate',
  },
  {
    name: 'Native Clock',
    description: "Desk clock with today's tasks, weather, stocks, and a headline ticker.",
    icon: '🕐',
    href: '/apps/native-clock',
  },
  {
    name: 'LG Remote',
    description: 'Control your LG WebOS TV from the browser through a local laptop proxy.',
    icon: '📺',
    href: '/apps/lg-remote',
  },
  {
    name: 'Project Waves',
    description:
      'Track your daily brushing routine and hair care sessions to build and maintain 360 waves.',
    icon: '〰️',
    href: '/apps/waves',
  },
  {
    name: 'FastTrack',
    description:
      'Track controlled fasts with a live timer, cooldown rule, calendar, and lifetime metrics.',
    icon: '⏳',
    href: '/apps/fast',
  },
]

export default function AppPlayground() {
  const [layout, setLayout] = useState<Layout>('stacked')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'stacked' || saved === 'side-by-side') {
      setLayout(saved)
    }
  }, [])

  const updateLayout = (next: Layout) => {
    setLayout(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <div className={layout === 'side-by-side' ? 'max-w-6xl mx-auto px-6 py-8' : 'max-w-lg mx-auto px-6 py-8'}>
      <div className="flex items-center justify-between gap-4 mb-8">
        <p className="text-textMuted font-inter text-sm">Personal tools, built for you.</p>
        <div className="flex items-center rounded-lg border border-gold overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => updateLayout('stacked')}
            aria-pressed={layout === 'stacked'}
            aria-label="Stacked layout"
            title="Stacked"
            className={`p-2 transition-colors ${
              layout === 'stacked'
                ? 'bg-gold text-textPrimary'
                : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            <Rows3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => updateLayout('side-by-side')}
            aria-pressed={layout === 'side-by-side'}
            aria-label="Side-by-side layout"
            title="Side by side"
            className={`p-2 transition-colors ${
              layout === 'side-by-side'
                ? 'bg-gold text-textPrimary'
                : 'text-textMuted hover:text-textPrimary'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className={`grid gap-4 ${
          layout === 'side-by-side'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1'
        }`}
      >
        {apps.map((app) => (
          <AppCard key={app.href} {...app} />
        ))}
      </div>
    </div>
  )
}
