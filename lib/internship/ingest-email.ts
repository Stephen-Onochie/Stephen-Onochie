// Proof-of-life email for the ingestion routine. Sent server-side by
// /api/internship/ingest when the routine posts with first_run=true (the first
// scan of the day), so the inbox confirms the routine ran. Personal-website
// branding: warm beige/gold theme, Playfair heading.

import type { IngestResponse } from '@/types/internship'

export interface IngestEmail {
  subject: string
  html: string
}

function stat(label: string, value: string): string {
  return `<tr>
    <td style="padding:7px 0;color:#8C7355;font-size:13px;">${label}</td>
    <td style="padding:7px 0;color:#2C1F0E;font-size:13px;text-align:right;font-weight:600;">${value}</td>
  </tr>`
}

export function buildIngestEmail(summary: IngestResponse, runAt: Date = new Date()): IngestEmail {
  const when = runAt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F5F0E8;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;">Stephen Onochie · Internship Tracker</div>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;color:#2C1F0E;margin:6px 0 4px;">Ingestion ran</h1>
    <p style="color:#8C7355;font-size:13px;margin:0 0 20px;">Daily automated scan · ${when}</p>

    <div style="background:#EDE8DC;border:1px solid #E2C97E;border-radius:14px;padding:18px;">
      <table style="width:100%;border-collapse:collapse;">
        ${stat('New matches inserted', String(summary.inserted))}
        ${stat('Duplicates skipped', String(summary.skipped_duplicates))}
        ${stat('Out-of-season skipped', String(summary.skipped_season))}
        ${stat('Lane 1 deadline alerts', String(summary.deadline_alerts))}
        ${summary.capped ? stat('Capped at 50', 'yes') : ''}
      </table>
    </div>

    <div style="margin-top:28px;text-align:center;">
      <a href="https://stephenonochie.com/apps/internship" style="display:inline-block;background:#C9A84C;color:#2C1F0E;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:8px;">Open Tracker</a>
    </div>

    <p style="color:#A89A82;font-size:11px;text-align:center;margin-top:24px;">
      You're getting this once a day because the discovery routine is running. New
      finds and closing Lane 1 deadlines appear in the Sunday review.
    </p>
  </div>
</body></html>`

  return {
    subject: `Internship Tracker — ${summary.inserted} new match${summary.inserted === 1 ? '' : 'es'} today`,
    html,
  }
}
