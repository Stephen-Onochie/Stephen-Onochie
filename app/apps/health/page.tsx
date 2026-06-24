'use client'

import { useEffect, useMemo, useState } from 'react'
import IvenModule from '@/components/iven/IvenModule'
import ChartCard from '@/components/health/ChartCard'
import { MetricBarChart, MetricLineChart } from '@/components/health/MetricCharts'
import RangeToggle from '@/components/health/RangeToggle'
import SummaryCards from '@/components/health/SummaryCards'
import MetricSearch from '@/components/health/MetricSearch'
import HealthAskPanel from '@/components/health/HealthAskPanel'
import HealthLoading from '@/components/health/HealthLoading'
import { average, peak } from '@/lib/health/stats'
import type { DateRange, FeaturedSeries } from '@/types/health'

const STEP_GOAL = 10000

function fmtRange(series: FeaturedSeries): string {
  const s = series.steps
  if (!s.length) return ''
  const fmt = (d: string) => {
    const [, m, day] = d.split('-')
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[Number(m)]} ${Number(day)}`
  }
  return `${fmt(s[0].date)} — ${fmt(s[s.length - 1].date)}`
}

export default function HealthPage() {
  const [range, setRange] = useState<DateRange>('30d')
  const [data, setData] = useState<FeaturedSeries | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/health-data?range=${range}`)
      .then(r => r.json())
      .then(d => {
        if (d?.steps) setData(d as FeaturedSeries)
      })
      .finally(() => setLoading(false))
  }, [range])

  const rangeLabel = useMemo(() => (data ? fmtRange(data) : ''), [data])
  const hasData = data && data.steps.length > 0

  const right = <RangeToggle value={range} onChange={setRange} />

  return (
    <IvenModule index={9} title="Health" right={right}>
      <div className="flex flex-col gap-[18px] pb-8">
        <div className="font-playfair italic text-lg" style={{ color: 'var(--iven-muted)' }}>
          Weekly summary &amp; trends
        </div>

        {loading && !data && <HealthLoading />}

        {!hasData && !loading && (
          <div
            className="rounded-2xl p-8 font-mono text-sm text-center"
            style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)', color: 'var(--iven-muted)' }}
          >
            No health data yet. Configure Health Auto Export to POST to <span style={{ color: 'var(--iven-text)' }}>/api/health-ingest</span>.
          </div>
        )}

        {data && (
          <>
            <SummaryCards data={data} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
              {/* Daily Steps — full width */}
              <ChartCard
                eyebrow="Movement"
                title="Daily Steps"
                headlineValue={loading ? '–' : Math.round(average(data.steps)).toLocaleString()}
                headlineCaption="avg / day"
                footerLeft={rangeLabel}
                footerRight={`Peak ${Math.round(peak(data.steps)).toLocaleString()}`}
                fullWidth
              >
                <MetricBarChart data={data.steps} unit="steps" goal={STEP_GOAL} height={190} />
              </ChartCard>

              {/* Resting Heart Rate */}
              <ChartCard
                eyebrow="Cardiac"
                title="Resting Heart Rate"
                headlineValue={data.restingHr.length ? `${Math.round(data.restingHr[data.restingHr.length - 1].value)}` : '–'}
                headlineCaption="bpm now"
                footerLeft={data.restingHr.length ? `Low ${Math.round(Math.min(...data.restingHr.map(p => p.value)))}` : ''}
                footerRight={data.restingHr.length ? `High ${Math.round(peak(data.restingHr))} bpm` : ''}
              >
                <MetricLineChart data={data.restingHr} unit="bpm" area />
              </ChartCard>

              {/* HRV with rolling average */}
              <ChartCard
                eyebrow="Recovery"
                title="HRV"
                headlineValue={data.hrvAvg.length ? `${Math.round(data.hrvAvg[data.hrvAvg.length - 1].value)}` : '–'}
                headlineCaption="ms · 7d avg"
                footerLeft="7-day avg"
                footerRight="daily"
              >
                <MetricLineChart data={data.hrv} avgData={data.hrvAvg} unit="ms" />
              </ChartCard>

              {/* Sleep — color coded */}
              <ChartCard
                eyebrow="Rest"
                title="Sleep Duration"
                headlineValue={loading ? '–' : average(data.sleep).toFixed(1)}
                headlineCaption="avg hrs"
                footerLeft="≥7h green · 6–7h gold · <6h red"
              >
                <MetricBarChart
                  data={data.sleep}
                  unit="h"
                  colorFor={v => (v >= 7 ? '#5E7A4E' : v >= 6 ? 'accent' : '#B5532E')}
                />
              </ChartCard>

              {/* Active Calories */}
              <ChartCard
                eyebrow="Energy"
                title="Active Calories"
                headlineValue={loading ? '–' : Math.round(average(data.active)).toLocaleString()}
                headlineCaption="avg kcal"
                footerLeft={rangeLabel}
                footerRight={`Peak ${Math.round(peak(data.active)).toLocaleString()} kcal`}
              >
                <MetricBarChart data={data.active} unit="kcal" />
              </ChartCard>
            </div>

            {/* LLM Q&A */}
            <HealthAskPanel />

            {/* Search across all 100+ metrics */}
            <div className="mt-2">
              <div className="font-mono text-[10px] font-semibold tracking-[2.6px] uppercase mb-3" style={{ color: 'var(--iven-muted)' }}>
                Explore All Metrics
              </div>
              <MetricSearch range={range} />
            </div>
          </>
        )}
      </div>
    </IvenModule>
  )
}
