'use client'

import { useState } from 'react'
import AppHeader from '@/components/apps/AppHeader'
import AlertOverlay from '@/components/standing-timer/AlertOverlay'
import HistoryView from '@/components/standing-timer/HistoryView'
import SettingsView from '@/components/standing-timer/SettingsView'
import StandingTimerNav from '@/components/standing-timer/StandingTimerNav'
import StatsView from '@/components/standing-timer/StatsView'
import TimerView from '@/components/standing-timer/TimerView'
import { useStandingTimer } from '@/hooks/useStandingTimer'
import type { StandingTimerTab } from '@/types/standing-timer'

export default function StandingTimerPage() {
  const [tab, setTab] = useState<StandingTimerTab>('timer')
  const timer = useStandingTimer()

  const headerRight =
    timer.state?.status === 'running'
      ? 'Running'
      : timer.state?.status === 'paused'
        ? 'Paused'
        : 'Idle'

  return (
    <main className="min-h-screen bg-beige pb-24">
      <AppHeader
        title="Standing Timer"
        right={
          <span className="text-textMuted text-sm font-inter capitalize">{headerRight}</span>
        }
      />

      {timer.loading && (
        <div className="px-4 pt-8 space-y-4 max-w-lg mx-auto">
          <div className="bg-surface rounded-full h-[280px] animate-pulse" />
          <div className="bg-surface rounded-2xl h-12 animate-pulse" />
        </div>
      )}

      {timer.error && (
        <div className="text-center py-16 px-4">
          <p className="text-textMuted font-inter text-sm">{timer.error}</p>
        </div>
      )}

      {!timer.loading && !timer.error && timer.state && timer.settings && (
        <>
          {tab === 'timer' && (
            <TimerView
              state={timer.state}
              remainingSeconds={timer.remainingSeconds}
              plannedSeconds={timer.plannedSeconds}
              nextMode={timer.nextMode}
              nextDurationMinutes={timer.nextDurationMinutes}
              sessionIntervalCount={timer.sessionIntervalCount}
              sessionElapsedSeconds={timer.sessionElapsedSeconds}
              actionLoading={timer.actionLoading}
              onStart={timer.start}
              onPause={timer.pause}
              onResume={timer.resume}
              onReset={timer.reset}
            />
          )}
          {tab === 'stats' && <StatsView stats={timer.stats} loading={timer.loading} />}
          {tab === 'history' && (
            <HistoryView history={timer.history} loading={timer.loading} />
          )}
          {tab === 'settings' && (
            <SettingsView
              settings={timer.settings}
              notificationPermission={timer.notificationPermission}
              onSave={timer.saveSettings}
            />
          )}
        </>
      )}

      <AlertOverlay alert={timer.alert} onDismiss={timer.dismissAlert} />
      <StandingTimerNav activeTab={tab} onTabChange={(t) => setTab(t as StandingTimerTab)} />
    </main>
  )
}
