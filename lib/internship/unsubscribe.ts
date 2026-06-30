import { createHmac, timingSafeEqual } from 'crypto'

// One-click unsubscribe links carry a signed token so the GET route can flip
// email_subscribed without a session. The token is HMAC(user_id) using a stable
// server secret — no new env var, reuses what's already configured.
function secret(): string {
  const s = process.env.INGEST_SECRET || process.env.CRON_SECRET
  if (!s) throw new Error('No secret available for unsubscribe token signing')
  return s
}

function sign(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('hex')
}

/** `<userId>.<sig>` — opaque to the recipient, verifiable server-side. */
export function makeUnsubscribeToken(userId: string): string {
  return `${userId}.${sign(userId)}`
}

/** Returns the userId if the token is valid, else null. */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const userId = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(userId)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  return timingSafeEqual(a, b) ? userId : null
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stephenonochie.com'

export function unsubscribeUrl(userId: string): string {
  return `${SITE_URL}/api/internship/unsubscribe?token=${encodeURIComponent(makeUnsubscribeToken(userId))}`
}

/** Shared email footer with the unsubscribe link, matching the muted small-print. */
export function unsubscribeFooterHtml(userId: string): string {
  return `<p style="color:#A89A82;font-size:11px;text-align:center;margin-top:24px;border-top:1px solid #E0D6C2;padding-top:16px;">
    You're receiving Stephen's internship updates.
    <a href="${unsubscribeUrl(userId)}" style="color:#A89A82;text-decoration:underline;">Unsubscribe</a>
  </p>`
}
