import type { SupabaseClient } from '@supabase/supabase-js'
import type { PublicViewSettings } from '@/types/public-view'
import type { PortfolioProjectRow } from '@/types/portfolio'
import { PORTFOLIO_MEDIA_BUCKET } from '@/lib/portfolio/media'

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

const PROJECT_COLUMNS =
  'id, user_id, slug, title, eyebrow, summary, tags, link_label, facts, body, cover_path, gallery, links, sort_order, published, created_at, updated_at'

export async function fetchPortfolioProjects(supabase: SupabaseClient): Promise<PortfolioProjectRow[]> {
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('portfolio_projects')
    .select(PROJECT_COLUMNS)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as PortfolioProjectRow[]
}

export type ProjectDraft = Omit<PortfolioProjectRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export async function savePortfolioProject(
  supabase: SupabaseClient,
  id: string | null,
  draft: ProjectDraft
): Promise<PortfolioProjectRow> {
  const userId = await requireUserId(supabase)
  const query = id
    ? supabase
        .from('portfolio_projects')
        .update({ ...draft, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
    : supabase.from('portfolio_projects').insert({ ...draft, user_id: userId })
  const { data, error } = await query.select(PROJECT_COLUMNS).single()
  if (error) throw error
  return data as PortfolioProjectRow
}

export async function deletePortfolioProject(supabase: SupabaseClient, row: PortfolioProjectRow): Promise<void> {
  const { error } = await supabase.from('portfolio_projects').delete().eq('id', row.id)
  if (error) throw error
  const paths = [row.cover_path, ...row.gallery.map(g => g.path)].filter((p): p is string => !!p)
  if (paths.length) await supabase.storage.from(PORTFOLIO_MEDIA_BUCKET).remove(paths)
}

export async function reorderPortfolioProjects(supabase: SupabaseClient, ids: string[]): Promise<void> {
  const now = new Date().toISOString()
  const results = await Promise.all(
    ids.map((id, i) =>
      supabase.from('portfolio_projects').update({ sort_order: i * 10, updated_at: now }).eq('id', id)
    )
  )
  const failed = results.find(r => r.error)
  if (failed?.error) throw failed.error
}

export async function uploadPortfolioImage(supabase: SupabaseClient, projectSlug: string, file: Blob): Promise<string> {
  const userId = await requireUserId(supabase)
  const path = `${userId}/${projectSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage
    .from(PORTFOLIO_MEDIA_BUCKET)
    .upload(path, file, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

export async function removePortfolioImage(supabase: SupabaseClient, path: string): Promise<void> {
  await supabase.storage.from(PORTFOLIO_MEDIA_BUCKET).remove([path])
}

export async function revalidatePortfolio(): Promise<void> {
  await fetch('/api/portfolio/revalidate', { method: 'POST' }).catch(() => {})
}
