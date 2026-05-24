'use client'

import { useEffect, useState } from 'react'

interface Repo {
  id: number
  name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
}

function RepoCell({ repo }: { repo: Repo }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-grid bg-beige p-5 md:p-6 hover:bg-surface hover:border-gold transition-colors duration-200 group min-h-[140px] flex flex-col"
    >
      <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-textPrimary group-hover:text-gold transition-colors duration-200 truncate">
        {repo.name}
      </h3>
      {repo.description && (
        <p className="text-textMuted text-xs leading-relaxed mt-3 line-clamp-3 flex-1">
          {repo.description}
        </p>
      )}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-grid text-[10px] uppercase tracking-[0.15em] text-textMuted">
        {repo.language && <span>{repo.language}</span>}
        {repo.stargazers_count > 0 && <span>★ {repo.stargazers_count}</span>}
      </div>
    </a>
  )
}

function SkeletonCell() {
  return (
    <div className="border border-grid bg-beige p-6 animate-pulse min-h-[140px]">
      <div className="h-4 bg-surface w-2/3 mb-4" />
      <div className="h-3 bg-surface w-full mb-2" />
      <div className="h-3 bg-surface w-4/5" />
    </div>
  )
}

export default function GitHubSection() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/github')
      .then((r) => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then((data) => {
        setRepos(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  return (
    <section id="github" className="border-b border-grid">
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] border-b border-grid">
        <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-grid flex flex-col justify-center">
          <h2 className="font-display text-3xl md:text-4xl uppercase tracking-wide text-textPrimary">
            Projects
          </h2>
          <a
            href="https://github.com/Stephen-Onochie"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mt-3 hover:text-brownAccent transition-colors duration-200"
          >
            @Stephen-Onochie →
          </a>
        </div>
        <div className="p-6 md:p-8 font-mono text-xs text-textMuted uppercase tracking-[0.2em] flex items-center">
          Selected repositories · GitHub API
        </div>
      </div>

      <div className="p-6 md:p-8">
        {error ? (
          <p className="font-mono text-sm text-textMuted">
            Unable to load GitHub repositories right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-grid border border-grid">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-beige">
                    <SkeletonCell />
                  </div>
                ))
              : repos.map((repo) => (
                  <div key={repo.id} className="bg-beige">
                    <RepoCell repo={repo} />
                  </div>
                ))}
          </div>
        )}
      </div>
    </section>
  )
}
