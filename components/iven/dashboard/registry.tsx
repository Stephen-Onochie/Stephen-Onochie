import type { ComponentType } from 'react'
import ClockHeroWidget from './ClockHeroWidget'
import TodoWidget from './TodoWidget'
import StandingTimerWidget from './StandingTimerWidget'
import WeatherWidget from './WeatherWidget'
import StocksWidget from './StocksWidget'
import WavesStreakWidget from './WavesStreakWidget'
import ReadingWidget from './ReadingWidget'
import HealthStepsWidget from './health/HealthStepsWidget'
import HealthRecoveryWidget from './health/HealthRecoveryWidget'
import type { DashboardWidgetLayout } from '@/types/health'

export interface WidgetDef {
  id: string
  label: string
  component: ComponentType
  // Default absolute geometry in pixels: x/y top-left, w/h size.
  defaultLayout: Omit<DashboardWidgetLayout, 'i'>
  minW: number
  minH: number
}

// Pixel-based defaults laid out edge-to-edge with no gaps. Two columns of
// ~636px on a ~1288px canvas, full-width hero on top.
export const WIDGETS: WidgetDef[] = [
  { id: 'clock', label: 'Clock', component: ClockHeroWidget, defaultLayout: { x: 0, y: 0, w: 1288, h: 220 }, minW: 280, minH: 140 },
  { id: 'todo', label: 'Todo', component: TodoWidget, defaultLayout: { x: 0, y: 236, w: 636, h: 372 }, minW: 240, minH: 200 },
  { id: 'stocks', label: 'Markets', component: StocksWidget, defaultLayout: { x: 0, y: 624, w: 636, h: 300 }, minW: 240, minH: 200 },
  { id: 'standing-timer', label: 'Standing Timer', component: StandingTimerWidget, defaultLayout: { x: 652, y: 236, w: 636, h: 300 }, minW: 240, minH: 200 },
  { id: 'weather', label: 'Weather', component: WeatherWidget, defaultLayout: { x: 652, y: 552, w: 636, h: 220 }, minW: 240, minH: 140 },
  { id: 'waves', label: 'Project Waves', component: WavesStreakWidget, defaultLayout: { x: 652, y: 788, w: 636, h: 220 }, minW: 240, minH: 140 },
  { id: 'reading', label: 'Reading', component: ReadingWidget, defaultLayout: { x: 0, y: 940, w: 636, h: 220 }, minW: 240, minH: 140 },
  { id: 'health-steps', label: 'Health · Steps', component: HealthStepsWidget, defaultLayout: { x: 652, y: 1024, w: 636, h: 300 }, minW: 240, minH: 200 },
  { id: 'health-recovery', label: 'Health · Recovery', component: HealthRecoveryWidget, defaultLayout: { x: 0, y: 1176, w: 636, h: 300 }, minW: 240, minH: 200 },
]

export const WIDGET_MAP: Record<string, WidgetDef> = Object.fromEntries(
  WIDGETS.map(w => [w.id, w])
)

// Default enabled set reproduces the original hardcoded dashboard (no health
// widgets shown until the user adds them), so nothing visually regresses.
export const DEFAULT_ENABLED = ['clock', 'todo', 'stocks', 'standing-timer', 'weather', 'waves']

export function defaultLayoutFor(enabled: string[]): DashboardWidgetLayout[] {
  return enabled
    .map(id => WIDGET_MAP[id])
    .filter(Boolean)
    .map(w => ({ i: w.id, ...w.defaultLayout }))
}
