'use client'

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'
import { isOwnerBrowser, isPrivatePath } from '@/lib/site-analytics/visitor'

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  if (isOwnerBrowser()) return null
  if (isPrivatePath(new URL(event.url).pathname)) return null
  return event
}

export default function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />
}
