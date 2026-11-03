import { easternDateStr } from '@/lib/dates'
import type { Application } from '@/types/internship'

export const DEFAULT_EXPIRY_DAYS = 7

/** Postings older than this are skipped by the scan and expire off the board. */
export const MAX_POSTING_AGE_DAYS = 30

const HOUR_MS = 3_600_000

/** Eastern calendar days since the scan found this posting; null if never scraped. */
export function daysSinceScraped(app: Application, now: Date = new Date()): number | null {
  if (!app.scraped_at) return null
  const from = Date.parse(easternDateStr(new Date(app.scraped_at)))
  const to = Date.parse(easternDateStr(now))
  return Math.round((to - from) / 86_400_000)
}

/** Best guess at when the job went up: the source's posting date, else when the
 *  scan found it (rows from before posted_at was stored), else when it was added. */
export function postedAt(app: Application): string {
  return app.posted_at ?? app.scraped_at ?? app.created_at
}

export function hoursSincePosted(app: Application, now: Date = new Date()): number {
  return (now.getTime() - Date.parse(postedAt(app))) / HOUR_MS
}

export function isPostingTooOld(postedIso: string | null | undefined, now: Date = new Date()): boolean {
  if (!postedIso) return false
  const t = Date.parse(postedIso)
  return !isNaN(t) && now.getTime() - t > MAX_POSTING_AGE_DAYS * 24 * HOUR_MS
}

/** Scraped postings still sitting in wishlist that were posted over a month ago,
 *  or were scraped `expiryDays`+ days ago without an application. */
export function isExpired(
  app: Application,
  expiryDays: number = DEFAULT_EXPIRY_DAYS,
  now: Date = new Date()
): boolean {
  if (app.stage !== 'wishlist' || app.expiry_kept) return false
  const days = daysSinceScraped(app, now)
  if (days === null) return false
  return days >= expiryDays || hoursSincePosted(app, now) > MAX_POSTING_AGE_DAYS * 24
}

export function scrapedAgoLabel(days: number): string {
  if (days <= 0) return 'Scraped today'
  if (days === 1) return 'Scraped 1 day ago'
  return `Scraped ${days} days ago`
}

export function postedAgoLabel(hours: number): string {
  if (hours < 1) return 'Posted just now'
  if (hours < 24) return `Posted ${Math.floor(hours)}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'Posted 1 day ago' : `Posted ${days} days ago`
}

export type PostedWindow = 'all' | '24h' | 'week' | 'month'

export const POSTED_WINDOW_LABELS: Record<Exclude<PostedWindow, 'all'>, string> = {
  '24h': 'Past 24 hours',
  week: 'Past week',
  month: 'Past month',
}

const WINDOW_HOURS: Record<Exclude<PostedWindow, 'all'>, number> = {
  '24h': 24,
  week: 24 * 7,
  month: 24 * MAX_POSTING_AGE_DAYS,
}

export function inPostedWindow(app: Application, window: PostedWindow, now: Date = new Date()): boolean {
  if (window === 'all') return true
  return hoursSincePosted(app, now) <= WINDOW_HOURS[window]
}
