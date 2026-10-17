// "Your week of fits is ready" email, sent by the Sunday cron after planning.
// Personal-website branding: warm beige/gold theme, Playfair heading.

import { SLOT_LABELS, WEEKLY_SLOTS } from '@/lib/stylemate/constants'
import type { Outfit, WardrobeItem } from '@/types/stylemate'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

export function buildWeeklyEmail(outfits: Outfit[], items: WardrobeItem[]): { subject: string; html: string } {
  const names = new Map(items.map(i => [i.id, i.name]))
  const slotOrder = WEEKLY_SLOTS.map(s => s.slot as string)
  const days = Array.from(new Set(outfits.map(o => o.plan_date).filter((d): d is string => !!d))).sort()

  const dayBlocks = days.map(date => {
    const dayOutfits = outfits
      .filter(o => o.plan_date === date)
      .sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot))
    const weather = dayOutfits[0]?.weather
    const rows = dayOutfits.map(o => `
      <tr>
        <td style="padding:8px 10px 8px 0;vertical-align:top;width:84px;color:#C9A84C;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">${SLOT_LABELS[o.slot]}</td>
        <td style="padding:8px 0;vertical-align:top;">
          <div style="color:#2C1F0E;font-size:14px;font-weight:600;">${escapeHtml(o.title)}</div>
          <div style="color:#8C7355;font-size:12px;margin-top:2px;">${escapeHtml(o.item_ids.map(id => names.get(id)).filter(Boolean).join(' · '))}</div>
        </td>
      </tr>`).join('')
    return `
    <div style="background:#EDE8DC;border:1px solid #E2C97E;border-radius:14px;padding:14px 18px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;">
        <span style="font-family:'Playfair Display',Georgia,serif;font-size:17px;color:#2C1F0E;font-weight:700;">${dayLabel(date)}</span>
      </div>
      ${weather ? `<div style="color:#8C7355;font-size:12px;margin:2px 0 6px;">${weather.highF}° / ${weather.lowF}° · ${escapeHtml(weather.condition)}${weather.precipChance >= 30 ? ` · ${weather.precipChance}% rain` : ''}</div>` : ''}
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F5F0E8;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;">Stephen Onochie · StyleMate</div>
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;color:#2C1F0E;margin:6px 0 4px;">Your week of fits is ready</h1>
    <p style="color:#8C7355;font-size:13px;margin:0 0 20px;">${outfits.length} outfits planned around this week's forecast.</p>
    ${dayBlocks}
    <div style="margin-top:24px;text-align:center;">
      <a href="https://stephenonochie.com/apps/stylemate?tab=outfits" style="display:inline-block;background:#C9A84C;color:#2C1F0E;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:10px 20px;border-radius:8px;">See the looks</a>
    </div>
  </div>
</body></html>`

  return { subject: `StyleMate: your ${days.length}-day outfit plan is ready`, html }
}
