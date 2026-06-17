'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Check, Pause, Play, ChevronRight } from 'lucide-react'
import { WAVE_ANGLES } from '@/types/waves'
import type { SessionStep, StrokeLog, WaveAngle, BrushType } from '@/types/waves'

const BRUSH_LABEL: Record<BrushType, string> = {
  comb: 'Comb',
  hard: 'Hard Brush',
  medium: 'Medium Brush',
  soft: 'Soft Brush',
}

function formatMmSs(seconds: number) {
  const m = Math.floor(Math.abs(seconds) / 60).toString().padStart(2, '0')
  const s = (Math.abs(seconds) % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

interface SessionRunnerProps {
  emoji: string
  label: string
  steps: SessionStep[]
  onCancel: () => void
  onComplete: (brushingSeconds: number, strokeLog: StrokeLog) => void
}

export default function SessionRunner({ emoji, label, steps, onCancel, onComplete }: SessionRunnerProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [running, setRunning] = useState(true)

  // timed-step state
  const [timeLeft, setTimeLeft] = useState(() =>
    steps[0]?.kind === 'timed' ? steps[0].durationSecs : 0,
  )

  // brush-step state
  const [angleIndex, setAngleIndex] = useState(0)
  const [angleCount, setAngleCount] = useState(0)
  const [autoBrush, setAutoBrush] = useState(false)

  // accumulators
  const strokeLog = useRef<StrokeLog>({})
  const elapsedSecs = useRef(0)

  const step = steps[stepIndex]
  const isLast = stepIndex >= steps.length - 1

  const finish = useCallback(() => {
    onComplete(elapsedSecs.current, strokeLog.current)
  }, [onComplete])

  // Set the countdown for the step being entered so it is correct on the same
  // render as the step change (avoids a stale-zero auto-advance race).
  const advanceStep = useCallback(() => {
    if (isLast) {
      finish()
      return
    }
    const next = steps[stepIndex + 1]
    setStepIndex(stepIndex + 1)
    setTimeLeft(next.kind === 'timed' ? next.durationSecs : 0)
    setAngleIndex(0)
    setAngleCount(0)
    setAutoBrush(false)
    setRunning(true)
  }, [isLast, stepIndex, steps, finish])

  // Wall-clock accrual for timed + brush steps (the "active brushing" time)
  useEffect(() => {
    if (!running) return
    if (step.kind === 'plain') return
    const id = setInterval(() => { elapsedSecs.current += 1 }, 1000)
    return () => clearInterval(id)
  }, [running, step])

  // Timed-step countdown
  useEffect(() => {
    if (step.kind !== 'timed' || !running || timeLeft <= 0) return
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [step, running, timeLeft])

  // Auto-advance when a timed step hits zero
  useEffect(() => {
    if (step.kind === 'timed' && timeLeft === 0 && running) {
      advanceStep()
    }
  }, [timeLeft, step, running, advanceStep])

  // Auto-brush ticker (~1 stroke/sec)
  useEffect(() => {
    if (step.kind !== 'brush' || !autoBrush || !running) return
    const id = setInterval(() => setAngleCount(c => c + 1), 1000)
    return () => clearInterval(id)
  }, [step, autoBrush, running])

  function recordAngle(brush: BrushType, angle: WaveAngle, count: number) {
    const log = strokeLog.current
    if (!log[brush]) log[brush] = {}
    log[brush][angle] = (log[brush][angle] ?? 0) + count
  }

  function nextAngle() {
    if (step.kind !== 'brush') return
    recordAngle(step.brush, WAVE_ANGLES[angleIndex], angleCount)
    if (angleIndex >= WAVE_ANGLES.length - 1) {
      setAutoBrush(false)
      advanceStep()
      return
    }
    setAngleIndex(i => i + 1)
    setAngleCount(0)
  }

  const progress = (stepIndex + 1) / steps.length

  return (
    <div className="fixed inset-0 bg-textPrimary z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-14 pb-4">
        <button onClick={onCancel} className="text-white/50 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <div className="text-center">
          <div className="text-3xl">{emoji}</div>
          <div className="text-white font-playfair text-lg font-bold">{label}</div>
        </div>
        <div className="w-6" />
      </div>

      {/* Overall step progress */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/40 font-inter text-xs">Step {stepIndex + 1} of {steps.length}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1 mb-6">
          <div className="bg-gold h-1 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Active step body */}
      <div className="flex-1 overflow-y-auto px-6">
        {step.kind === 'timed' && (
          <div className="flex flex-col items-center">
            <div className="font-mono text-8xl font-bold text-white tracking-tight tabular-nums">
              {formatMmSs(timeLeft)}
            </div>
            <p className="text-white/70 font-inter text-base text-center mt-6 leading-relaxed max-w-xs">{step.text}</p>
            <button
              onClick={() => setRunning(r => !r)}
              className="mt-8 px-8 py-2 rounded-full border border-white/20 text-white font-inter text-sm hover:bg-white/10 transition-colors inline-flex items-center gap-2"
            >
              {running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Resume</>}
            </button>
          </div>
        )}

        {step.kind === 'brush' && (
          <div className="flex flex-col items-center">
            <div className="text-white/40 font-inter text-xs uppercase tracking-widest mb-1">{BRUSH_LABEL[step.brush]}</div>
            <div className="text-gold font-playfair text-2xl font-bold mb-4">{WAVE_ANGLES[angleIndex]}</div>

            <div className="font-mono text-7xl font-bold text-white tracking-tight tabular-nums">
              {angleCount}
              <span className="text-2xl text-white/40">/{step.strokesPerAngle}</span>
            </div>

            {/* Angle progress dots */}
            <div className="flex gap-2 mt-5">
              {WAVE_ANGLES.map((a, i) => (
                <div
                  key={a}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < angleIndex ? 'bg-gold' : i === angleIndex ? 'bg-white' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>

            <p className="text-white/60 font-inter text-sm text-center mt-5 leading-relaxed max-w-xs">{step.text}</p>

            {/* Tap counter */}
            <button
              onClick={() => setAngleCount(c => c + 1)}
              className="mt-6 w-40 h-40 rounded-full bg-gold/15 border-2 border-gold text-gold font-inter font-semibold text-lg hover:bg-gold/25 active:scale-95 transition-all"
            >
              Tap
            </button>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setAutoBrush(a => !a)}
                className={`px-5 py-2 rounded-full border font-inter text-sm transition-colors ${
                  autoBrush ? 'bg-gold border-gold text-white' : 'border-white/20 text-white hover:bg-white/10'
                }`}
              >
                {autoBrush ? 'Auto · on' : 'Auto'}
              </button>
              <button
                onClick={nextAngle}
                className="px-5 py-2 rounded-full border border-white/20 text-white font-inter text-sm hover:bg-white/10 transition-colors inline-flex items-center gap-1.5"
              >
                {angleIndex >= WAVE_ANGLES.length - 1 ? 'Finish brush' : 'Next angle'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step.kind === 'plain' && (
          <div className="flex flex-col items-center justify-center pt-10">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Check className="w-7 h-7 text-gold" />
            </div>
            <p className="text-white/80 font-inter text-lg text-center leading-relaxed max-w-xs">{step.text}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-10 pt-4 space-y-3">
        {step.kind !== 'brush' && (
          <button
            onClick={advanceStep}
            className="w-full bg-gold text-white font-inter font-semibold py-4 rounded-2xl text-base hover:bg-goldLight transition-colors"
          >
            {isLast ? 'Complete Session' : 'Next Step'}
          </button>
        )}
        <button
          onClick={finish}
          className="w-full text-white/40 font-inter text-sm hover:text-white/70 transition-colors"
        >
          Finish &amp; save now
        </button>
      </div>
    </div>
  )
}
