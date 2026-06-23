import { NextResponse } from 'next/server'
import type { BookSearchResult } from '@/types/reading'

export const revalidate = 3600

interface OpenLibraryDoc {
  title?: string
  author_name?: string[]
  cover_i?: number
  number_of_pages_median?: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])

  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=6&fields=title,author_name,cover_i,number_of_pages_median`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Stephen-Onochie-Portfolio/1.0 (reading-tracker)' },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Search failed' }, { status: res.status })
    }

    const data: { docs?: OpenLibraryDoc[] } = await res.json()
    const results: BookSearchResult[] = (data.docs ?? [])
      .filter(d => d.title)
      .slice(0, 6)
      .map(d => ({
        title: d.title!,
        author: d.author_name?.[0] ?? null,
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
        totalPages: d.number_of_pages_median ?? null,
      }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
