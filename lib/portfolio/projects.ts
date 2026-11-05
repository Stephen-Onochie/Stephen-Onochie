import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { PortfolioProject, PortfolioProjectRow } from '@/types/portfolio'
import { portfolioMediaUrl } from './media'
import { SEED_PROJECTS } from './seed-projects'

export const PROJECTS_TAG = 'portfolio-projects'

function toPublic(row: PortfolioProjectRow): PortfolioProject {
  return {
    slug: row.slug,
    title: row.title,
    eyebrow: row.eyebrow,
    summary: row.summary,
    tags: row.tags ?? [],
    linkLabel: row.link_label,
    facts: row.facts ?? [],
    body: row.body,
    coverUrl: row.cover_path ? portfolioMediaUrl(row.cover_path) : null,
    gallery: (row.gallery ?? []).map(g => ({ url: portfolioMediaUrl(g.path), caption: g.caption })),
    links: row.links ?? [],
    updatedAt: row.updated_at,
  }
}

// Published projects for the owner (HEALTH_USER_ID, same as the other public
// routes), cached until Public View saves and calls revalidateTag.
export const getPublishedProjects = unstable_cache(
  async (): Promise<PortfolioProject[]> => {
    const ownerId = process.env.HEALTH_USER_ID
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!ownerId || !url || !key) return SEED_PROJECTS

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase
      .from('portfolio_projects')
      .select('*')
      .eq('user_id', ownerId)
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error || !data) return SEED_PROJECTS
    return (data as PortfolioProjectRow[]).map(toPublic)
  },
  ['portfolio-projects'],
  { tags: [PROJECTS_TAG], revalidate: 3600 }
)

export async function getPublishedProject(slug: string): Promise<PortfolioProject | null> {
  const projects = await getPublishedProjects()
  return projects.find(p => p.slug === slug) ?? null
}
