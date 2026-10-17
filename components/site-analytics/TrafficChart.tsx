'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useIvenColors } from '@/components/health/useIvenColors'
import type { TrendPoint } from '@/lib/site-analytics/report'
import { formatDayLabel, formatHourLabel } from './format'

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  unit: 'hour' | 'day'
}

function TrafficTooltip({ active, payload, label, unit }: TooltipProps) {
  const colors = useIvenColors()
  if (!active || !payload?.length || !label) return null
  return (
    <div
      className="font-mono text-[11px] px-2.5 py-1.5 rounded-lg"
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, color: colors.text }}
    >
      <div style={{ color: colors.muted }}>{unit === 'hour' ? formatHourLabel(label) : formatDayLabel(label)}</div>
      <div className="font-semibold">
        {payload[0].value} {payload[0].value === 1 ? 'view' : 'views'}
      </div>
    </div>
  )
}

export default function TrafficChart({ data, unit, height = 200 }: { data: TrendPoint[]; unit: 'hour' | 'day'; height?: number }) {
  const colors = useIvenColors()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <CartesianGrid stroke={colors.grid} strokeOpacity={0.45} vertical={false} />
        <XAxis
          dataKey="label"
          tickFormatter={label => (unit === 'hour' ? formatHourLabel(label) : formatDayLabel(label))}
          tick={{ fill: colors.muted, fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} width={28} tick={{ fill: colors.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<TrafficTooltip unit={unit} />} cursor={{ fill: colors.grid, fillOpacity: 0.18 }} />
        <Bar dataKey="views" fill={colors.accent} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
