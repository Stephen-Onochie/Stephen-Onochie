export interface ProjectFact {
  label: string
  value: string
}

export interface ProjectLink {
  label: string
  url: string
}

export interface ProjectImage {
  path: string
  caption: string
}

// Row shape of public.portfolio_projects (owner-edited in Public View).
export interface PortfolioProjectRow {
  id: string
  user_id: string
  slug: string
  title: string
  eyebrow: string
  summary: string
  tags: string[]
  link_label: string
  facts: ProjectFact[]
  body: string
  cover_path: string | null
  gallery: ProjectImage[]
  links: ProjectLink[]
  sort_order: number
  published: boolean
  created_at: string
  updated_at: string
}

// What the public site renders: storage paths resolved to public URLs.
export interface PortfolioProject {
  slug: string
  title: string
  eyebrow: string
  summary: string
  tags: string[]
  linkLabel: string
  facts: ProjectFact[]
  body: string
  coverUrl: string | null
  gallery: { url: string; caption: string }[]
  links: ProjectLink[]
  updatedAt: string
}
