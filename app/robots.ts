import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/portfolio/content'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/apps', '/api', '/login', '/auth'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
