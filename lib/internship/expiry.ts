import { easternDateStr } from '@/lib/dates'
import type { Application } from '@/types/internship'

export const EXPIRY_DAYS = 7

/** Eastern calendar days since the scan found this posting; null if never scraped. */
export function daysSinceScraped(app: Application, now: Date = new Date()): number | null {
  if (!app.scraped_at) return null
  const from = Date.parse(easternDateStr(new Date(app.scraped_at)))
  const to = Date.parse(easternDateStr(now))
  return Math.round((to - from) / 86_400_000)
}

/** Scraped postings still sitting in wishlist EXPIRY_DAYS after the scan. */
export function isExpired(app: Application, now: Date = new Date()): boolean {
  if (app.stage !== 'wishlist' || app.expiry_kept) return false
  const days = daysSinceScraped(app, now)
  return days !== null && days >= EXPIRY_DAYS
}

export function scrapedAgoLabel(days: number): string {
  if (days <= 0) return 'Scraped today'
  if (days === 1) return 'Scraped 1 day ago'
  return `Scraped ${days} days ago`
}
