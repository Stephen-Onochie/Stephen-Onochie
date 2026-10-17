'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import IvenModule from '@/components/iven/IvenModule'
import ChartCard from '@/components/health/ChartCard'
import RangeToggle from '@/components/health/RangeToggle'
import TrafficChart from '@/components/site-analytics/TrafficChart'
import RankedList, { type RankedItem } from '@/components/site-analytics/RankedList'
import {
  formatCountry,
  formatDevice,
  formatPath,
  formatReferrer,
} from '@/components/site-analytics/format'
import type { AnalyticsRange, SiteAnalyticsReport } from '@/lib/site-analytics/report'
import type { TrafficRow } from '@/lib/site-analytics/vercel'

const RANGE_OPTIONS: { key: AnalyticsRange; label: string }[] = [
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'all', label: 'ALL' },
]

const RANGE_CAPTION: Record<AnalyticsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days · nightly snapshots',
  all: 'All time · nightly snapshots',
}

function toRanked(rows: TrafficRow[], format: (key: string) => string): RankedItem[] {
  return rows.map(row => ({
    key: row.key || '(none)',
    label: format(row.key),
    value: row.views,
    detail: `${row.visitors} ${row.visitors === 1 ? 'visitor' : 'visitors'} ·`,
  }))
}

function StatCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div
      className="rounded-2xl px-[22px] py-5"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
    >
      <div className="font-mono text-[10px] tracking-[2.6px] uppercase" style={{ color: 'var(--iven-muted)' }}>
        {label}
      </div>
      <div className="font-inter font-extrabold text-[34px] tracking-[-0.02em] mt-3.5" style={{ color: 'var(--iven-text)' }}>
        {value}
      </div>
      <div className="font-mono text-[10px] mt-2" style={{ color: 'var(--iven-muted)' }}>
        {caption}
      </div>
    </div>
  )
}

export default function SiteAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('7d')
  const [report, setReport] = useState<SiteAnalyticsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestFailed, setRequestFailed] = useState(false)

  useEffect(() => {
    setLoading(true)
    setRequestFailed(false)
    fetch(`/api/site-analytics?range=${range}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: SiteAnalyticsReport) => setReport(data))
      .catch(() => setRequestFailed(true))
      .finally(() => setLoading(false))
  }, [range])

  const right = <RangeToggle value={range} onChange={setRange} options={RANGE_OPTIONS} />
  const viewsPerVisitor = report && report.visitors > 0 ? (report.views / report.visitors).toFixed(1) : '–'

  return (
    <IvenModule index={10} title="Site Analytics" right={right}>
      <div className="flex flex-col gap-[18px] pb-8" style={{ opacity: loading && report ? 0.55 : 1, transition: 'opacity 150ms' }}>
        <div className="font-playfair italic text-lg" style={{ color: 'var(--iven-muted)' }}>
          stephenonochie.com · public site only · {RANGE_CAPTION[range]}
        </div>

        {requestFailed && (
          <Notice message="Couldn't load analytics. Refresh to try again." />
        )}
        {report?.trafficError && <Notice message={report.trafficError} />}

        {loading && !report ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl h-[132px] animate-pulse" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }} />
            ))}
          </div>
        ) : (
          report && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Page views" value={report.views.toLocaleString()} caption={RANGE_CAPTION[report.range]} />
                <StatCard
                  label="Visitors"
                  value={report.visitors.toLocaleString()}
                  caption={report.visitorsAreDailySums ? 'Unique per day, summed' : 'Unique visitors'}
                />
                <StatCard label="Views / visitor" value={viewsPerVisitor} caption="Pages per visit" />
                <StatCard label="Tracked clicks" value={report.totalClicks.toLocaleString()} caption="Links & buttons" />
              </div>

              <ChartCard
                eyebrow={report.trendUnit === 'hour' ? 'Hourly' : 'Daily'}
                title="Page views"
                fullWidth
              >
                {report.trend.length > 0 ? (
                  <TrafficChart data={report.trend} unit={report.trendUnit} />
                ) : (
                  <div className="font-mono text-[11px] py-16 text-center" style={{ color: 'var(--iven-muted)' }}>
                    {report.source === 'snapshot'
                      ? 'No snapshots yet. The nightly job fills these in.'
                      : 'No views in this range.'}
                  </div>
                )}
              </ChartCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard eyebrow="Where people land" title="Top pages">
                  <RankedList items={toRanked(report.topPages, formatPath)} emptyLabel="No page views yet" />
                </ChartCard>
                <ChartCard eyebrow="What people click" title="Top clicks">
                  <RankedList
                    items={report.clicks.slice(0, 10).map(row => ({ key: row.target, label: row.label, value: row.clicks }))}
                    emptyLabel="No tracked clicks yet"
                  />
                </ChartCard>
                <ChartCard eyebrow="How they found you" title="Referrers">
                  <RankedList items={toRanked(report.referrers, formatReferrer)} emptyLabel="No referrer data yet" />
                </ChartCard>
                <ChartCard eyebrow="Where they are" title="Countries">
                  <RankedList items={toRanked(report.countries, formatCountry)} emptyLabel="No country data yet" />
                </ChartCard>
                <ChartCard eyebrow="What they use" title="Devices">
                  <RankedList items={toRanked(report.devices, formatDevice)} emptyLabel="No device data yet" />
                </ChartCard>
              </div>

              <p className="font-mono text-[10px] leading-relaxed m-0" style={{ color: 'var(--iven-muted)' }}>
                Page views come from Vercel Web Analytics (refreshed every 10 minutes). Your own browsing is
                excluded from Oct 17, 2026 onward; private /apps pages never count. Clicks are recorded by the
                site itself.
              </p>
            </>
          )
        )}
      </div>
    </IvenModule>
  )
}

function Notice({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-5 py-4 font-mono text-[11px] leading-relaxed"
      style={{
        background: 'color-mix(in srgb, #B5532E 10%, var(--iven-surface))',
        border: '1px solid color-mix(in srgb, #B5532E 45%, var(--iven-border))',
        color: 'var(--iven-text)',
      }}
    >
      <AlertTriangle size={15} className="shrink-0 mt-[1px]" style={{ color: '#B5532E' }} />
      <span>{message}</span>
    </div>
  )
}
