import type { SupabaseClient } from '@supabase/supabase-js'
import { reconcileNavOrder } from '@/components/iven/nav-registry'

export async function loadSidebarOrder(supabase: SupabaseClient): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return reconcileNavOrder(null)

  const { data } = await supabase
    .from('iven_preferences')
    .select('sidebar_order')
    .eq('user_id', user.id)
    .maybeSingle()

  return reconcileNavOrder(data?.sidebar_order)
}

export async function saveSidebarOrder(supabase: SupabaseClient, order: string[]): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return
  const { error } = await supabase.from('iven_preferences').upsert({
    user_id: session.user.id,
    sidebar_order: order,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}
