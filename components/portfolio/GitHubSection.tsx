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

const languageColors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  CSS: '#563d7c',
  HTML: '#e34c26',
  default: '#8C7355',
}

function LanguageDot({ language }: { language: string | null }) {
  if (!language) return null
  const color = languageColors[language] ?? languageColors.default
  return (
    <span className="flex items-center gap-1.5 text-sm text-textMuted">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {language}
    </span>
  )
}

function RepoCard({ repo }: { repo: Repo }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-beige border border-goldLight rounded-xl p-6 hover:border-gold hover:shadow-md transition-all duration-200 group"
    >
      <h3 className="font-inter font-semibold text-textPrimary group-hover:text-brownAccent transition-colors mb-2 truncate">
        {repo.name}
      </h3>
      {repo.description && (
        <p className="text-textMuted text-sm leading-relaxed mb-4 line-clamp-2">
          {repo.description}
        </p>
      )}
      <div className="flex items-center gap-4 mt-auto">
        <LanguageDot language={repo.language} />
        {repo.stargazers_count > 0 && (
          <span className="flex items-center gap-1 text-sm text-textMuted">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {repo.stargazers_count}
          </span>
        )}
      </div>
    </a>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-beige border border-goldLight rounded-xl p-6 animate-pulse">
      <div className="h-5 bg-surface rounded w-3/4 mb-3" />
      <div className="h-4 bg-surface rounded w-full mb-2" />
      <div className="h-4 bg-surface rounded w-2/3 mb-4" />
      <div className="h-3 bg-surface rounded w-1/4" />
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
    <section id="github" className="py-20 px-6 bg-beige">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h2 className="font-playfair text-4xl md:text-5xl font-bold text-textPrimary mb-2">
            Projects
          </h2>
          <a
            href="https://github.com/Stephen-Onochie"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:text-brownAccent font-inter text-sm transition-colors"
          >
            @Stephen-Onochie on GitHub →
          </a>
        </div>

        {error ? (
          <p className="text-textMuted font-inter">
            Unable to load GitHub repositories right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : repos.map((repo) => <RepoCard key={repo.id} repo={repo} />)}
          </div>
        )}
      </div>
    </section>
  )
}
