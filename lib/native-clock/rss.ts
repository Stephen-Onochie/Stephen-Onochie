import type { NativeClockHeadline } from '@/types/native-clock'

const DEFAULT_FEED = 'https://feeds.npr.org/1001/rss.xml'

export function getNewsFeedUrl(): string {
  return process.env.NATIVE_CLOCK_NEWS_FEED?.trim() || DEFAULT_FEED
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim()
}

function stripTags(text: string): string {
  return decodeXmlEntities(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
}

export function parseRssHeadlines(xml: string, limit = 12): NativeClockHeadline[] {
  const headlines: NativeClockHeadline[] = []
  const itemRegex = /<item[\s\S]*?<\/item>/gi
  const items = xml.match(itemRegex) ?? []

  for (const item of items) {
    if (headlines.length >= limit) break

    const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)
    const pubMatch = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)

    const title = titleMatch ? stripTags(titleMatch[1]) : ''
    const link = linkMatch ? stripTags(linkMatch[1]) : ''

    if (!title) continue

    headlines.push({
      title,
      link: link || '#',
      publishedAt: pubMatch ? stripTags(pubMatch[1]) : undefined,
    })
  }

  return headlines
}

export async function fetchNewsHeadlines(
  feedOverride?: string
): Promise<{
  headlines: NativeClockHeadline[]
  source: string
}> {
  const feedUrl = feedOverride?.trim() || getNewsFeedUrl()
  const response = await fetch(feedUrl, {
    headers: { 'User-Agent': 'Stephen-Onochie-NativeClock/1.0' },
    next: { revalidate: 1800 },
  })

  if (!response.ok) {
    throw new Error('News feed unavailable')
  }

  const xml = await response.text()
  const headlines = parseRssHeadlines(xml)

  if (headlines.length === 0) {
    throw new Error('No headlines found')
  }

  let source = 'News'
  try {
    source = new URL(feedUrl).hostname.replace(/^www\./, '')
  } catch {
    // keep default label
  }

  return { headlines, source }
}
