'use client'

import { useIvenDarkMode } from './IvenDarkModeContext'
import IvenSidebar from './IvenSidebar'
import StandingTimerEventToast from './StandingTimerEventToast'
import { useStandingTimerEngine } from '@/hooks/useStandingTimerEngine'

export default function IvenShell({ children }: { children: React.ReactNode }) {
  const { dark } = useIvenDarkMode()
  useStandingTimerEngine()

  return (
    <div
      data-iven-theme={dark ? 'dark' : 'light'}
      className="flex overflow-hidden"
      style={{ height: '100dvh', background: 'var(--iven-bg)', color: 'var(--iven-text)' }}
    >
      <IvenSidebar />
      <main className="flex-1 overflow-y-auto" style={{ minWidth: 0 }}>
        {children}
      </main>
      <StandingTimerEventToast />
    </div>
  )
}
