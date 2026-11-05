import type { MetadataRoute } from 'next'
import { getPublishedProjects } from '@/lib/portfolio/projects'
import { SITE_URL } from '@/lib/portfolio/content'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getPublishedProjects()
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    ...projects.map(p => ({
      url: `${SITE_URL}/work/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
