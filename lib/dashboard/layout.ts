import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardLayoutConfig } from '@/types/health'
import { DEFAULT_ENABLED, defaultLayoutFor, WIDGET_MAP } from '@/components/iven/dashboard/registry'

export function defaultConfig(): DashboardLayoutConfig {
  return { widgets: DEFAULT_ENABLED, layout: defaultLayoutFor(DEFAULT_ENABLED) }
}

// Legacy react-grid-layout configs stored w/h in grid units (≤12). The absolute
// layout uses pixels, so a tiny width means a stale config that must be reset.
function isLegacyGridLayout(config: DashboardLayoutConfig): boolean {
  return config.layout.some(l => l.w <= 12 && l.h <= 12)
}

// Reconcile a stored config against the current registry: drop widgets that no
// longer exist, and give any enabled-but-unplaced widget a default slot.
export function reconcile(config: DashboardLayoutConfig): DashboardLayoutConfig {
  if (isLegacyGridLayout(config)) {
    const widgets = config.widgets.filter(id => WIDGET_MAP[id])
    return { widgets, layout: defaultLayoutFor(widgets) }
  }
  const widgets = config.widgets.filter(id => WIDGET_MAP[id])
  const placed = new Map(config.layout.filter(l => WIDGET_MAP[l.i]).map(l => [l.i, l]))
  // New widgets get parked in a stack below everything currently placed.
  let nextY = Math.max(0, ...Array.from(placed.values()).map(l => l.y + l.h)) + 16
  for (const id of widgets) {
    if (!placed.has(id)) {
      const def = WIDGET_MAP[id]
      placed.set(id, { i: id, ...def.defaultLayout, x: 0, y: nextY })
      nextY += def.defaultLayout.h + 16
    }
  }
  return { widgets, layout: Array.from(placed.values()) }
}

export async function loadLayout(supabase: SupabaseClient): Promise<DashboardLayoutConfig> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return defaultConfig()

  const { data } = await supabase
    .from('dashboard_layouts')
    .select('layout')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!data?.layout) return defaultConfig()
  return reconcile(data.layout as DashboardLayoutConfig)
}

export async function saveLayout(supabase: SupabaseClient, config: DashboardLayoutConfig): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return
  await supabase.from('dashboard_layouts').upsert({
    user_id: session.user.id,
    layout: config,
    updated_at: new Date().toISOString(),
  })
}
