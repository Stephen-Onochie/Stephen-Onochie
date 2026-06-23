export interface HealthMetricRow {
  id: string
  user_id: string
  recorded_at: string
  ingested_at: string
  metric_type: string
  value: number
  unit: string | null
  source_device: string | null
  source_app: string | null
  raw_payload: unknown
}

// How a metric should be charted / aggregated across a day.
// - 'sum'  : counts that accumulate (steps, calories, distance) → daily total, bars
// - 'avg'  : rates/levels (heart rate, hrv, spo2) → daily average, line
// - 'last' : point-in-time states (weight, vo2max) → latest of the day, line
export type Aggregation = 'sum' | 'avg' | 'last'
export type ChartKind = 'bar' | 'line'

export interface MetricDef {
  type: string // normalized metric_type stored in the DB
  label: string // human label for search + chart titles
  unit: string
  category: string // grouping for search ("Cardiac", "Movement", ...)
  aggregation: Aggregation
  chart: ChartKind
}

export interface DailyPoint {
  date: string // YYYY-MM-DD
  value: number
}

export interface FeaturedSeries {
  steps: DailyPoint[]
  restingHr: DailyPoint[]
  hrv: DailyPoint[]
  hrvAvg: DailyPoint[] // 7-day rolling average of hrv
  sleep: DailyPoint[]
  active: DailyPoint[]
}

export type DateRange = '7d' | '30d' | '90d' | 'all'

export interface DashboardWidgetLayout {
  i: string // widget id from the registry
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardLayoutConfig {
  widgets: string[] // enabled widget ids
  layout: DashboardWidgetLayout[]
}
