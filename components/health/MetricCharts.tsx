'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { DailyPoint } from '@/types/health'
import { useIvenColors } from './useIvenColors'

function fmtDate(d: string): string {
  const [, m, day] = d.split('-')
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[Number(m)]} ${Number(day)}`
}

function TooltipBox({ active, payload, label, unit }: any) {
  const colors = useIvenColors()
  if (!active || !payload?.length) return null
  return (
    <div
      className="font-mono text-[11px] px-2.5 py-1.5 rounded-lg"
      style={{ background: colors.surface, border: `1px solid ${colors.border}`, color: colors.text }}
    >
      <div style={{ color: colors.muted }}>{fmtDate(label)}</div>
      <div className="font-semibold">
        {payload[0].value}
        {unit ? ` ${unit}` : ''}
      </div>
    </div>
  )
}

interface LineProps {
  data: DailyPoint[]
  unit?: string
  area?: boolean
  avgData?: DailyPoint[] // optional overlay (e.g. 7-day rolling average)
  height?: number
}

export function MetricLineChart({ data, unit, area, avgData, height = 170 }: LineProps) {
  const colors = useIvenColors()
  const merged = data.map((p, i) => ({
    date: p.date,
    value: p.value,
    avg: avgData?.[i]?.value,
  }))

  const common = (
    <>
      <CartesianGrid stroke={colors.grid} strokeOpacity={0.45} vertical={false} />
      <XAxis dataKey="date" hide />
      <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
      <Tooltip content={<TooltipBox unit={unit} />} cursor={{ stroke: colors.grid }} />
    </>
  )

  if (area && !avgData) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={merged} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id="iven-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          {common}
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.accent}
            strokeWidth={2.2}
            fill="url(#iven-area)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        {common}
        <Line type="monotone" dataKey="value" stroke={colors.grid} strokeWidth={1.4} dot={false} opacity={0.85} />
        {avgData && (
          <Line type="monotone" dataKey="avg" stroke={colors.accent} strokeWidth={2.4} dot={false} />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

interface BarProps {
  data: DailyPoint[]
  unit?: string
  goal?: number
  colorFor?: (value: number) => string
  height?: number
}

export function MetricBarChart({ data, unit, goal, colorFor, height = 170 }: BarProps) {
  const colors = useIvenColors()
  // colorFor may return the literal "accent" sentinel — resolve it to the live
  // accent color since recharts writes the value straight into an SVG fill.
  const resolveColor = (v: number) => {
    const c = colorFor!(v)
    return c === 'accent' ? colors.accent : c
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <CartesianGrid stroke={colors.grid} strokeOpacity={0.45} vertical={false} />
        <XAxis dataKey="date" hide />
        <YAxis hide />
        <Tooltip content={<TooltipBox unit={unit} />} cursor={{ fill: colors.grid, fillOpacity: 0.15 }} />
        {goal !== undefined && (
          <ReferenceLine
            y={goal}
            stroke={colors.muted}
            strokeDasharray="4 4"
            label={{
              value: `GOAL ${goal.toLocaleString()}`,
              position: 'right',
              fill: colors.muted,
              fontSize: 9,
              fontFamily: 'monospace',
            }}
          />
        )}
        <Bar dataKey="value" radius={[3, 3, 0, 0]} fill={colors.accent}>
          {colorFor &&
            data.map((p, i) => <Cell key={i} fill={resolveColor(p.value)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
