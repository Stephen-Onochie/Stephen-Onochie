import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyUnsubscribeToken } from '@/lib/internship/unsubscribe'

export const dynamic = 'force-dynamic'

// One-click unsubscribe from internship emails. Clicked straight from an inbox,
// so there's no session — auth is the signed token. Flips email_subscribed off
// for the matching user via the service-role client.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const userId = verifyUnsubscribeToken(token)

  if (!userId) {
    return htmlResponse(
      'Invalid link',
      "This unsubscribe link is invalid or has expired. You can manage email settings inside the tracker.",
      400
    )
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('internship_settings')
    .update({ email_subscribed: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    return htmlResponse(
      'Something went wrong',
      "We couldn't update your preference just now. Please try again, or change it in the tracker settings.",
      500
    )
  }

  return htmlResponse(
    "You're unsubscribed",
    'You will no longer receive the Sunday review or the daily discovery email. Re-enable any time from the tracker settings.',
    200
  )
}

function htmlResponse(heading: string, body: string, status: number) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heading}</title></head>
<body style="margin:0;background:#F5F0E8;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:80px auto;padding:32px 24px;text-align:center;">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;">Internship Tracker</div>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;color:#2C1F0E;margin:10px 0 14px;">${heading}</h1>
    <p style="color:#8C7355;font-size:14px;line-height:1.6;margin:0 0 24px;">${body}</p>
    <a href="https://stephenonochie.com/apps/internship" style="display:inline-block;background:#C9A84C;color:#2C1F0E;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:8px;">Open Tracker</a>
  </div>
</body></html>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
