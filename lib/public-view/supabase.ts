import type { SupabaseClient } from '@supabase/supabase-js'
import type { PublicViewSettings } from '@/types/public-view'

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')
  return session.user.id
}

// Auto-creates the row on first read so the DB column defaults seed every field.
export async function fetchPublicViewSettings(
  supabase: SupabaseClient
): Promise<PublicViewSettings> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('public_view_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (data) return data as PublicViewSettings

  const { data: created, error: insertErr } = await supabase
    .from('public_view_settings')
    .insert({ user_id: userId })
    .select('*')
    .single()
  if (insertErr) throw insertErr
  return created as PublicViewSettings
}

export async function updatePublicViewSettings(
  supabase: SupabaseClient,
  patch: Partial<PublicViewSettings>
): Promise<void> {
  const userId = await requireUserId(supabase)
  const { error } = await supabase
    .from('public_view_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw error
}
