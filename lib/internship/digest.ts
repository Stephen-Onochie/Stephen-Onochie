import type { Application, Contact, Interview } from '@/types/internship'
import {
  INTERVIEW_TYPE_LABELS,
  LANE_LABELS,
  CITY_LABELS,
  PRIORITY_LABELS,
} from '@/types/internship'
import {
  weeklyProgress,
  thisWeek,
  staleWishlist,
  type ReminderData,
} from './reminders'
import { formatShortDate, formatDateTime, daysUntil } from './dates'

export interface Digest {
  subject: string
  html: string
  hasContent: boolean
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:#8C7355;font-size:13px;">${label}</td><td style="padding:6px 0;color:#2C1F0E;font-size:13px;text-align:right;font-weight:600;">${value}</td></tr>`
}

function list(title: string, items: string[]): string {
  if (items.length === 0) return ''
  const lis = items.map(i => `<li style="margin:4px 0;color:#2C1F0E;font-size:13px;">${i}</li>`).join('')
  return `<div style="margin-top:18px;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:700;margin-bottom:6px;">${title}</div>
    <ul style="margin:0;padding-left:18px;">${lis}</ul>
  </div>`
}

function applyLink(a: Application, text: string): string {
  return a.job_url
    ? `<a href="${a.job_url}" style="color:#2C1F0E;">${text}</a>`
    : text
}

/** Ingestion rows added in the last 7 days, grouped by lane then city. */
function newlyDiscovered(data: ReminderData, now: Date): Application[] {
  return data.applications.filter(
    a => a.created_via === 'ingestion' && daysUntil(a.created_at, now) > -7
  )
}

/** Lane 1 program deadlines closing within 7 days (deadline-pounce). */
function lane1Pounce(data: ReminderData, now: Date): Application[] {
  return data.applications
    .filter(a => {
      if (a.lane !== 'lane1_program' || !a.deadline || a.stage === 'closed') return false
      const d = daysUntil(a.deadline, now)
      return d >= 0 && d <= 7
    })
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
}

export function buildDigest(data: ReminderData, now = new Date()): Digest {
  const wp = weeklyProgress(data, now)
  const tw = thisWeek(data, now)
  const stale = staleWishlist(data, now)
  const discovered = newlyDiscovered(data, now)
  const pounce = lane1Pounce(data, now)

  const deadlineItems = tw.deadlines.map(
    (a: Application) => `<strong>${a.company}</strong> — ${a.role_title} · due ${a.deadline ? formatShortDate(a.deadline) : ''}`
  )
  const contactItems = tw.overdueContacts.map(
    (c: Contact) => `<strong>${c.name}</strong>${c.next_action ? ` — ${c.next_action}` : ''}`
  )
  const interviewItems = tw.interviews.map((iv: Interview) => {
    const app = data.applications.find(a => a.id === iv.application_id)
    return `<strong>${app?.company ?? 'Unknown'}</strong> · ${INTERVIEW_TYPE_LABELS[iv.type]} · ${formatDateTime(iv.scheduled_at)}`
  })
  const staleItems = stale.map(a => `<strong>${a.company}</strong> — sitting in Wishlist`)

  const discoveredItems = discovered.map(a => {
    const where = `${LANE_LABELS[a.lane]} · ${CITY_LABELS[a.city_tag]}`
    const loc = a.location ? ` · ${a.location}` : ''
    const head = applyLink(a, `<strong>${a.company}</strong> — ${a.role_title}`)
    return `${head}${loc} · ${where} · ${PRIORITY_LABELS[a.priority]}`
  })

  const pounceItems = pounce.map(a => {
    const d = daysUntil(a.deadline!, now)
    const days = d === 0 ? 'today' : d === 1 ? '1 day left' : `${d} days left`
    return `${applyLink(a, `<strong>${a.company}</strong>`)} — ${a.role_title} · ${days}`
  })

  const hasContent =
    deadlineItems.length > 0 ||
    contactItems.length > 0 ||
    interviewItems.length > 0 ||
    staleItems.length > 0 ||
    discoveredItems.length > 0 ||
    pounceItems.length > 0

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F5F0E8;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;">Internship Tracker</div>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;color:#2C1F0E;margin:6px 0 20px;">Sunday Review</h1>

    <div style="background:#EDE8DC;border:1px solid #E2C97E;border-radius:14px;padding:18px;">
      <table style="width:100%;border-collapse:collapse;">
        ${row("This week's target", `${wp.actual} / ${wp.target} applied`)}
        ${row('Deadlines ≤14 days', String(tw.deadlines.length))}
        ${row('Overdue follow-ups', String(tw.overdueContacts.length))}
        ${row('Interviews this week', String(tw.interviews.length))}
      </table>
    </div>

    ${list('⚠ Lane 1 deadlines closing within 7 days', pounceItems)}
    ${list('Newly discovered', discoveredItems)}
    ${list('Lane 1 deadlines', deadlineItems)}
    ${list('Overdue follow-ups', contactItems)}
    ${list('Interviews this week', interviewItems)}
    ${list('Stale wishlist cards', staleItems)}

    <div style="margin-top:28px;text-align:center;">
      <a href="https://stephenonochie.com/apps/internship" style="display:inline-block;background:#C9A84C;color:#2C1F0E;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:8px;">Open Tracker</a>
    </div>
  </div>
</body></html>`

  return {
    subject: `Internship Tracker — Sunday Review (${wp.actual}/${wp.target} this week)`,
    html,
    hasContent,
  }
}
