import type { CSSProperties } from 'react'

export const TICKER_SCROLL_MIN_SEC = 10
export const TICKER_SCROLL_MAX_SEC = 180
export const TICKER_SCROLL_DEFAULT_SEC = 40

export function clampTickerScrollSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return TICKER_SCROLL_DEFAULT_SEC
  return Math.min(TICKER_SCROLL_MAX_SEC, Math.max(TICKER_SCROLL_MIN_SEC, Math.round(seconds)))
}

export function tickerScrollStyle(durationSec: number): CSSProperties {
  return {
    animationDuration: `${clampTickerScrollSeconds(durationSec)}s`,
  }
}
