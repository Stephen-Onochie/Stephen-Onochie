import type { ComponentType } from 'react'
import ClockHeroWidget from './ClockHeroWidget'
import TodoWidget from './TodoWidget'
import StandingTimerWidget from './StandingTimerWidget'
import WeatherWidget from './WeatherWidget'
import StocksWidget from './StocksWidget'
import WavesStreakWidget from './WavesStreakWidget'
import HealthStepsWidget from './health/HealthStepsWidget'
import HealthRecoveryWidget from './health/HealthRecoveryWidget'
import type { DashboardWidgetLayout } from '@/types/health'

export interface WidgetDef {
  id: string
  label: string
  component: ComponentType
  // Default grid geometry (12-col grid, row height ~70px).
  defaultLayout: Omit<DashboardWidgetLayout, 'i'>
  minW: number
  minH: number
}

export const WIDGETS: WidgetDef[] = [
  { id: 'clock', label: 'Clock', component: ClockHeroWidget, defaultLayout: { x: 0, y: 0, w: 12, h: 3 }, minW: 4, minH: 2 },
  { id: 'todo', label: 'Todo', component: TodoWidget, defaultLayout: { x: 0, y: 3, w: 7, h: 5 }, minW: 3, minH: 3 },
  { id: 'stocks', label: 'Markets', component: StocksWidget, defaultLayout: { x: 0, y: 8, w: 7, h: 4 }, minW: 3, minH: 3 },
  { id: 'standing-timer', label: 'Standing Timer', component: StandingTimerWidget, defaultLayout: { x: 7, y: 3, w: 5, h: 4 }, minW: 3, minH: 3 },
  { id: 'weather', label: 'Weather', component: WeatherWidget, defaultLayout: { x: 7, y: 7, w: 5, h: 3 }, minW: 3, minH: 2 },
  { id: 'waves', label: 'Project Waves', component: WavesStreakWidget, defaultLayout: { x: 7, y: 10, w: 5, h: 3 }, minW: 3, minH: 2 },
  { id: 'health-steps', label: 'Health · Steps', component: HealthStepsWidget, defaultLayout: { x: 0, y: 12, w: 6, h: 4 }, minW: 3, minH: 3 },
  { id: 'health-recovery', label: 'Health · Recovery', component: HealthRecoveryWidget, defaultLayout: { x: 6, y: 12, w: 6, h: 4 }, minW: 3, minH: 3 },
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
