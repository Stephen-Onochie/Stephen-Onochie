'use client'

import {
  formatCountdown,
  formatDurationHuman,
  MODE_COLORS,
  MODE_ICONS,
  MODE_LABELS,
} from '@/lib/standing-timer/cycle'
import ModeBadge from '@/components/standing-timer/ModeBadge'
import ProgressRing from '@/components/standing-timer/ProgressRing'
import type { TimerState, WorkstationMode } from '@/types/standing-timer'

interface TimerViewProps {
  state: TimerState
  remainingSeconds: number
  plannedSeconds: number
  nextMode: WorkstationMode
  nextDurationMinutes: number
  sessionIntervalCount: number
  sessionElapsedSeconds: number
  actionLoading: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
}

export default function TimerView({
  state,
  remainingSeconds,
  plannedSeconds,
  nextMode,
  nextDurationMinutes,
  sessionIntervalCount,
  sessionElapsedSeconds,
  actionLoading,
  onStart,
  onPause,
  onResume,
  onReset,
}: TimerViewProps) {
  const isIdle = state.status === 'idle'
  const isRunning = state.status === 'running'
  const isPaused = state.status === 'paused'
  const modeColor = MODE_COLORS[state.current_mode]

  return (
    <div className="flex flex-col items-center px-4 pt-6 md:pt-10">
      <ProgressRing
        remainingSeconds={remainingSeconds}
        plannedSeconds={plannedSeconds}
        modeColor={modeColor}
      >
        <ModeBadge mode={state.current_mode} />
        <p className="font-playfair text-6xl md:text-7xl font-bold text-textPrimary mt-4 tabular-nums">
          {formatCountdown(remainingSeconds)}
        </p>
        <p className="text-textMuted font-inter text-sm mt-2 capitalize">
          {isIdle && 'Ready to start'}
          {isRunning && 'In progress'}
          {isPaused && 'Paused'}
        </p>
      </ProgressRing>

      <div className="mt-8 bg-surface rounded-2xl px-5 py-3 text-center">
        <p className="text-textMuted font-inter text-xs uppercase tracking-[0.12em] mb-1">
          Up next
        </p>
        <p className="text-textPrimary font-inter text-sm font-medium">
          {MODE_ICONS[nextMode]} {MODE_LABELS[nextMode]} · {nextDurationMinutes}m
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8 w-full max-w-sm">
        {isIdle && (
          <button
            onClick={onStart}
            disabled={actionLoading}
            className="flex-1 min-w-[120px] py-3 px-6 bg-gold text-white rounded-xl font-inter font-medium hover:bg-brownAccent transition-colors disabled:opacity-50"
          >
            Start
          </button>
        )}
        {isRunning && (
          <button
            onClick={onPause}
            disabled={actionLoading}
            className="flex-1 min-w-[120px] py-3 px-6 bg-surface text-textPrimary border border-goldLight rounded-xl font-inter font-medium hover:border-gold transition-colors disabled:opacity-50"
          >
            Pause
          </button>
        )}
        {isPaused && (
          <button
            onClick={onResume}
            disabled={actionLoading}
            className="flex-1 min-w-[120px] py-3 px-6 bg-gold text-white rounded-xl font-inter font-medium hover:bg-brownAccent transition-colors disabled:opacity-50"
          >
            Resume
          </button>
        )}
        {!isIdle && (
          <button
            onClick={onReset}
            disabled={actionLoading}
            className="flex-1 min-w-[120px] py-3 px-6 bg-transparent text-textMuted border border-goldLight rounded-xl font-inter font-medium hover:text-textPrimary hover:border-gold transition-colors disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </div>

      {!isIdle && (
        <p className="text-textMuted font-inter text-sm mt-6 text-center">
          Session: {formatDurationHuman(sessionElapsedSeconds + (plannedSeconds - remainingSeconds))}
          {' · '}
          {sessionIntervalCount} interval{sessionIntervalCount === 1 ? '' : 's'} completed
        </p>
      )}
    </div>
  )
}
