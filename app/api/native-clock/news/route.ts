import { NextResponse } from 'next/server'
import { getAuthorizedAppUser } from '@/lib/native-clock/auth'
import { fetchNewsHeadlines } from '@/lib/native-clock/rss'
import { isValidFeedUrl } from '@/lib/native-clock/settings'

export async function GET(request: Request) {
  const user = await getAuthorizedAppUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const feed = new URL(request.url).searchParams.get('feed')?.trim()
  if (feed && !isValidFeedUrl(feed)) {
    return NextResponse.json({ error: 'Invalid feed URL' }, { status: 400 })
  }

  try {
    const data = await fetchNewsHeadlines(feed || undefined)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to load news' }, { status: 502 })
  }
}
