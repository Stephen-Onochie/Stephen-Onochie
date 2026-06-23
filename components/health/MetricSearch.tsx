'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { MetricDef, DateRange, DailyPoint } from '@/types/health'
import ChartCard from './ChartCard'
import { MetricBarChart, MetricLineChart } from './MetricCharts'
import { average, peak } from '@/lib/health/stats'

export default function MetricSearch({ range }: { range: DateRange }) {
  const [available, setAvailable] = useState<MetricDef[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<MetricDef | null>(null)
  const [series, setSeries] = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/health-data?list=1')
      .then(r => r.json())
      .then(d => setAvailable(d.metrics ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    fetch(`/api/health-data?metric=${encodeURIComponent(selected.type)}&range=${range}`)
      .then(r => r.json())
      .then(d => setSeries(d.series ?? []))
      .finally(() => setLoading(false))
  }, [selected, range])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return available
      .filter(m => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.type.includes(q))
      .slice(0, 8)
  }, [query, available])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--iven-muted)' }}
        />
        <input
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setSelected(null)
          }}
          placeholder="Search any metric — heart rate, weight, VO₂ max…"
          className="w-full rounded-xl pl-10 pr-4 py-3 font-inter text-sm outline-none"
          style={{
            background: 'var(--iven-surface)',
            border: '1px solid var(--iven-border)',
            color: 'var(--iven-text)',
          }}
        />
        {matches.length > 0 && !selected && (
          <div
            className="absolute z-10 mt-1 w-full rounded-xl overflow-hidden"
            style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)' }}
          >
            {matches.map(m => (
              <button
                key={m.type}
                onClick={() => {
                  setSelected(m)
                  setQuery(m.label)
                }}
                className="w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors hover:opacity-80"
                style={{ color: 'var(--iven-text)' }}
              >
                <span className="font-inter text-sm">{m.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
                  {m.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ChartCard
          eyebrow={selected.category}
          title={selected.label}
          headlineValue={
            loading
              ? '–'
              : selected.aggregation === 'sum'
                ? Math.round(average(series)).toLocaleString()
                : average(series).toFixed(1)
          }
          headlineCaption={selected.aggregation === 'sum' ? `avg ${selected.unit}/day` : `avg ${selected.unit}`}
          footerLeft={series.length ? `${series.length} days` : 'No data'}
          footerRight={selected.aggregation === 'sum' && series.length ? `Peak ${Math.round(peak(series)).toLocaleString()}` : ''}
          fullWidth
        >
          {series.length === 0 ? (
            <div className="h-[170px] flex items-center justify-center font-mono text-xs" style={{ color: 'var(--iven-muted)' }}>
              {loading ? 'Loading…' : 'No data in this range'}
            </div>
          ) : selected.chart === 'bar' ? (
            <MetricBarChart data={series} unit={selected.unit} />
          ) : (
            <MetricLineChart data={series} unit={selected.unit} area />
          )}
        </ChartCard>
      )}
    </div>
  )
}
