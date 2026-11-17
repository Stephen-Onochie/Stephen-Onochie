'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ApplyPace } from '@/lib/internship/reminders'

export interface CelebrationEvent {
  key: number
  company: string
  role: string
  pace: ApplyPace
}

const DURATION_MS = 2600

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  w: number
  h: number
  color: string
  round: boolean
}

function burst(out: Particle[], x: number, y: number, count: number, spread: number, angle: number, speed: number, colors: string[]) {
  for (let i = 0; i < count; i++) {
    const a = angle + (Math.random() - 0.5) * spread
    const v = speed * (0.45 + Math.random() * 0.75)
    out.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      w: 5 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      color: colors[i % colors.length],
      round: Math.random() < 0.3,
    })
  }
}

export default function ApplyCelebration({ event, onDone }: { event: CelebrationEvent | null; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!event) return
    const timer = window.setTimeout(onDone, DURATION_MS)
    if ('vibrate' in navigator) navigator.vibrate?.([18, 40, 28])

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (reduced || !canvas || !ctx) return () => window.clearTimeout(timer)

    const dpr = window.devicePixelRatio || 1
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const css = getComputedStyle(canvas)
    const accent = css.getPropertyValue('--iven-accent').trim() || '#C9A84C'
    const text = css.getPropertyValue('--iven-text').trim() || '#2C1F0E'
    const colors = [accent, '#7C8C5A', '#B5532E', '#E8D9B5', text, accent]

    const particles: Particle[] = []
    const tracker = document.querySelector('[data-apply-tracker]')?.getBoundingClientRect()
    if (tracker) {
      burst(particles, tracker.left + tracker.width / 2, tracker.bottom, 70, Math.PI * 0.9, Math.PI * 0.62, 14, colors)
    }
    burst(particles, W * 0.18, H, 55, 0.5, -Math.PI * 0.36, 22, colors)
    burst(particles, W * 0.82, H, 55, 0.5, -Math.PI * 0.64, 22, colors)

    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = now - start
      ctx.clearRect(0, 0, W, H)
      ctx.globalAlpha = t > DURATION_MS - 700 ? Math.max(0, (DURATION_MS - t) / 700) : 1
      for (const p of particles) {
        p.vx *= 0.985
        p.vy = p.vy * 0.985 + 0.32
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.round) {
          ctx.beginPath()
          ctx.arc(0, 0, p.h / 1.6, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Squash on one axis so the paper looks like it's tumbling.
          ctx.scale(1, Math.cos(p.rot * 2))
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      }
      if (t < DURATION_MS) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [event, onDone])

  if (!event || typeof document === 'undefined') return null

  const { pace } = event
  const remaining = pace.weekTarget - pace.week
  const line =
    remaining > 0
      ? `${remaining} more to hit this week's goal`
      : remaining === 0
        ? "Weekly goal hit. Keep the streak going."
        : `${-remaining} past this week's goal`

  // Portal to <body>, reading the theme tokens off the IVEN shell so the overlay
  // matches light/dark mode.
  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none" aria-live="polite">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div
        key={event.key}
        className="iven-celebrate-card absolute left-1/2 top-1/2 flex flex-col items-center text-center rounded-2xl px-9 py-7 min-w-[300px] max-w-[90vw]"
        style={{
          background: 'var(--iven-surface)',
          border: '1px solid var(--iven-border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          color: 'var(--iven-text)',
        }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
          <circle className="iven-check-ring" cx="28" cy="28" r="24" stroke="var(--iven-accent)" strokeWidth="3" />
          <path
            className="iven-check-mark"
            d="M17 29 l7.5 7.5 L39.5 21"
            stroke="var(--iven-accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="font-mono text-[10px] font-semibold tracking-[3px] uppercase mt-4" style={{ color: 'var(--iven-accent)' }}>
          Application sent
        </div>
        <div className="font-playfair font-bold text-[24px] mt-1.5 leading-tight">{event.company}</div>
        {event.role && (
          <div className="text-[13px] mt-1" style={{ color: 'var(--iven-muted)' }}>
            {event.role}
          </div>
        )}
        <div className="flex gap-6 mt-5">
          <div>
            <div className="font-mono font-bold text-[26px] leading-none">{pace.today}</div>
            <div className="font-mono text-[9px] tracking-[2px] uppercase mt-1" style={{ color: 'var(--iven-muted)' }}>
              Today
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-[26px] leading-none">{pace.week}</div>
            <div className="font-mono text-[9px] tracking-[2px] uppercase mt-1" style={{ color: 'var(--iven-muted)' }}>
              This week
            </div>
          </div>
        </div>
        <div className="font-mono text-[10px] mt-4" style={{ color: 'var(--iven-muted)' }}>
          {line}
        </div>
      </div>
    </div>,
    document.querySelector('[data-iven-theme]') ?? document.body
  )
}
