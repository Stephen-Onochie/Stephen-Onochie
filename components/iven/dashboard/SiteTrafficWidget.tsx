'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { SiteAnalyticsReport } from '@/lib/site-analytics/report'
import { formatPath } from '@/components/site-analytics/format'

export default function SiteTrafficWidget() {
  const [report, setReport] = useState<SiteAnalyticsReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/site-analytics?range=7d')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [])

  const trend = report?.trend ?? []
  const max = Math.max(...trend.map(point => point.views), 1)
  const unavailable = !loading && (!report || report.trafficError)

  return (
    <div
      className="rounded-[18px] p-6 flex flex-col h-full"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="font-mono text-[10px] font-semibold tracking-[2.5px] uppercase" style={{ color: 'var(--iven-accent)' }}>
          SITE TRAFFIC · 7D
        </div>
        <div className="flex gap-5">
          {[
            { label: 'VIEWS', value: report?.views },
            { label: 'VISITORS', value: report?.visitors },
            { label: 'CLICKS', value: report?.totalClicks },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-end">
              <span className="font-mono text-xl font-bold leading-none" style={{ color: 'var(--iven-text)' }}>
                {loading || stat.value === undefined ? '–' : stat.value.toLocaleString()}
              </span>
              <span className="font-mono text-[9px] tracking-[1px] mt-1" style={{ color: 'var(--iven-muted)' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 min-h-12 rounded-lg animate-pulse" style={{ background: 'var(--iven-grid)', opacity: 0.3 }} />
      ) : unavailable ? (
        <div className="flex-1 flex items-center justify-center font-mono text-[10px] text-center" style={{ color: 'var(--iven-muted)' }}>
          Traffic data unavailable. Open Site Analytics for details.
        </div>
      ) : (
        <>
          <div className="flex items-end gap-[3px] flex-1 min-h-12">
            {trend.map((point, i) => (
              <div
                key={point.label}
                className="flex-1 rounded-[3px]"
                title={`${point.label}: ${point.views} views`}
                style={{
                  height: `${Math.max(6, Math.round((point.views / max) * 100))}%`,
                  background: i === trend.length - 1 ? 'var(--iven-accent)' : 'color-mix(in srgb, var(--iven-accent) 45%, transparent)',
                }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1 mt-3">
            {report!.topPages.slice(0, 3).map(page => (
              <div key={page.key} className="flex justify-between font-mono text-[10px]" style={{ color: 'var(--iven-muted)' }}>
                <span className="truncate">{formatPath(page.key)}</span>
                <span style={{ color: 'var(--iven-text)' }}>{page.views}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Link href="/apps/analytics" className="font-mono text-[9px] tracking-[1.5px] uppercase mt-3 self-end" style={{ color: 'var(--iven-muted)' }}>
        Open analytics →
      </Link>
    </div>
  )
}
