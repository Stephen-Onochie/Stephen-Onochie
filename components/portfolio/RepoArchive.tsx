'use client'

import { useEffect, useState } from 'react'
import { repoClickTarget } from '@/lib/site-analytics/click-targets'

interface Repo {
  id: number
  name: string
  description: string | null
  html_url: string
  language: string | null
}

// Recent public repos from /api/github. Renders nothing until (and unless) the
// GitHub API answers, so a rate-limit never leaves an empty box on the page.
export default function RepoArchive() {
  const [repos, setRepos] = useState<Repo[]>([])

  useEffect(() => {
    fetch('/api/github')
      .then(r => (r.ok ? r.json() : []))
      .then((data: Repo[]) => setRepos(Array.isArray(data) ? data : []))
      .catch(() => setRepos([]))
  }, [])

  if (repos.length === 0) return null

  return (
    <div className="border-b border-pf-line py-4 grid gap-3 sm:grid-cols-[100px_1fr] items-baseline">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-pf-faint">On GitHub</p>
      <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {repos.map(repo => (
          <li key={repo.id} className="min-w-0">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              data-track={repoClickTarget(repo.name)}
              className="group block min-w-0"
            >
              <span className="font-mono text-[12.5px] text-pf-text group-hover:text-pf-accent-text transition-colors">
                {repo.name}
                {repo.language && <span className="text-pf-faint"> · {repo.language}</span>}
              </span>
              {repo.description && (
                <span className="block truncate text-[12.5px] text-pf-muted">{repo.description}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
