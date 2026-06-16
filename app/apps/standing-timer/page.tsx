'use client'

import { useState } from 'react'
import AlertOverlay from '@/components/standing-timer/AlertOverlay'
import HistoryView from '@/components/standing-timer/HistoryView'
import SettingsView from '@/components/standing-timer/SettingsView'
import StandingTimerNav from '@/components/standing-timer/StandingTimerNav'
import StatsView from '@/components/standing-timer/StatsView'
import TimerView from '@/components/standing-timer/TimerView'
import { useStandingTimer } from '@/hooks/useStandingTimer'
import IvenModule from '@/components/iven/IvenModule'
import type { StandingTimerTab } from '@/types/standing-timer'

export default function StandingTimerPage() {
  const [tab, setTab] = useState<StandingTimerTab>('timer')
  const timer = useStandingTimer()

  const statusLabel =
    timer.state?.status === 'running' ? 'RUNNING'
    : timer.state?.status === 'paused' ? 'PAUSED'
    : 'IDLE'

  return (
    <IvenModule
      index={4}
      title="Standing Timer"
      right={
        <span className="font-mono text-[11px] tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
          {statusLabel}
        </span>
      }
    >
      <div className="pb-24">
        {timer.loading && (
          <div className="px-4 pt-8 space-y-4 max-w-lg mx-auto">
            <div className="rounded-full h-[280px] animate-pulse" style={{ background: 'var(--iven-surface)' }} />
            <div className="rounded-2xl h-12 animate-pulse" style={{ background: 'var(--iven-surface)' }} />
          </div>
        )}

        {timer.error && (
          <div className="text-center py-16 px-4">
            <p className="font-inter text-sm" style={{ color: 'var(--iven-muted)' }}>{timer.error}</p>
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
            {tab === 'history' && <HistoryView history={timer.history} loading={timer.loading} />}
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
      </div>
    </IvenModule>
  )
}
