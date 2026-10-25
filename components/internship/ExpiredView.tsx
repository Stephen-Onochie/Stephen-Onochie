'use client'

import { ExternalLink, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateApplication } from '@/lib/internship/supabase'
import { formatShortDate } from '@/lib/internship/dates'
import { daysSinceScraped, EXPIRY_DAYS } from '@/lib/internship/expiry'
import type { Application } from '@/types/internship'
import { LaneBadge, CityBadge } from './ui'

export default function ExpiredView({
  applications,
  onChange,
  onOpen,
}: {
  applications: Application[]
  onChange: (app: Application) => void
  onOpen: (a: Application) => void
}) {
  const sorted = [...applications].sort((a, b) => (b.scraped_at ?? '').localeCompare(a.scraped_at ?? ''))

  async function restore(app: Application) {
    await updateApplication(createClient(), app.id, { expiry_kept: true })
    onChange({ ...app, expiry_kept: true })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] max-w-[620px]" style={{ color: 'var(--iven-muted)' }}>
        Postings the scan found that sat in Wishlist for {EXPIRY_DAYS}+ days without an application. They&apos;re
        hidden from the board and reminders, and staying here keeps the scan from re-adding them. Restore one to put it
        back on the board for good.
      </p>

      {sorted.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center text-[13px]"
          style={{ border: '1px dashed var(--iven-grid)', color: 'var(--iven-muted)' }}
        >
          Nothing expired.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--iven-grid)' }}>
          {sorted.map(a => (
            <div
              key={a.id}
              onClick={() => onOpen(a)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              style={{ borderBottom: '1px solid var(--iven-grid)', background: 'var(--iven-surface)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <LaneBadge lane={a.lane} />
                  <CityBadge city={a.city_tag} />
                </div>
                <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--iven-text)' }}>
                  {a.company}
                </div>
                <div className="text-[12px] truncate" style={{ color: 'var(--iven-muted)' }}>
                  {a.role_title}
                </div>
              </div>
              <div className="font-mono text-[10px] font-semibold text-right whitespace-nowrap" style={{ color: 'var(--iven-muted)' }}>
                Scraped {formatShortDate(a.scraped_at!)}
                <br />
                {daysSinceScraped(a)} days ago
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {a.job_url && (
                  <a
                    href={a.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-md"
                    style={{ color: 'var(--iven-muted)' }}
                    title="Open the posting"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={() => restore(a)}
                  className="p-2 rounded-md"
                  style={{ color: 'var(--iven-muted)' }}
                  title="Restore to the board"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
