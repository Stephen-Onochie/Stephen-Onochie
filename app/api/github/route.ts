import { NextResponse } from 'next/server'

export const revalidate = 3600

interface GitHubRepo {
  id: number
  name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  fork: boolean
  updated_at: string
}

export async function GET() {
  try {
    const response = await fetch(
      'https://api.github.com/users/Stephen-Onochie/repos?sort=updated&per_page=10',
      {
        headers: {
          'User-Agent': 'Stephen-Onochie-Portfolio/1.0',
          Accept: 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch GitHub repos' },
        { status: response.status }
      )
    }

    const repos: GitHubRepo[] = await response.json()

    // Filter out forks and return top 6
    const filtered = repos
      .filter((repo) => !repo.fork)
      .slice(0, 6)
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
      }))

    return NextResponse.json(filtered)
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
