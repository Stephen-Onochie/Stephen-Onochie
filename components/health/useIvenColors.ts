'use client'

import { useEffect, useState } from 'react'

export interface IvenColors {
  accent: string
  accentSoft: string
  grid: string
  muted: string
  text: string
  border: string
  surface: string
  good: string
  bad: string
}

const FALLBACK: IvenColors = {
  accent: '#C9A84C',
  accentSoft: 'rgba(201,168,76,0.45)',
  grid: '#B8A48E',
  muted: '#8C7355',
  text: '#2C1F0E',
  border: '#E2C97E',
  surface: '#EDE8DC',
  good: '#5E7A4E',
  bad: '#B5532E',
}

// recharts renders concrete color strings into SVG, so resolve the --iven-*
// tokens off the live DOM. Re-reads when the theme toggles (data-iven-theme).
export function useIvenColors(): IvenColors {
  const [colors, setColors] = useState<IvenColors>(FALLBACK)

  useEffect(() => {
    const read = () => {
      const root = document.querySelector('[data-iven-theme]') ?? document.documentElement
      const cs = getComputedStyle(root as Element)
      const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb
      const accent = v('--iven-accent', FALLBACK.accent)
      setColors({
        accent,
        accentSoft: `color-mix(in srgb, ${accent} 45%, transparent)`,
        grid: v('--iven-grid', FALLBACK.grid),
        muted: v('--iven-muted', FALLBACK.muted),
        text: v('--iven-text', FALLBACK.text),
        border: v('--iven-border', FALLBACK.border),
        surface: v('--iven-surface', FALLBACK.surface),
        good: '#5E7A4E',
        bad: '#B5532E',
      })
    }
    read()
    const target = document.querySelector('[data-iven-theme]')
    if (!target) return
    const obs = new MutationObserver(read)
    obs.observe(target, { attributes: true, attributeFilter: ['data-iven-theme'] })
    return () => obs.disconnect()
  }, [])

  return colors
}
