import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import PortfolioShell from '@/components/portfolio/PortfolioShell'
import SiteHeader from '@/components/portfolio/SiteHeader'
import Contact from '@/components/portfolio/Contact'
import Markdown from '@/components/portfolio/Markdown'
import { ProjectMedia } from '@/components/portfolio/ProjectCard'
import { CONTAINER, Tag } from '@/components/portfolio/ui'
import { getPublishedProjects, getPublishedProject } from '@/lib/portfolio/projects'
import { SITE_URL } from '@/lib/portfolio/content'
import { projectClickTarget } from '@/lib/site-analytics/click-targets'

export const revalidate = 3600

export async function generateStaticParams() {
  const projects = await getPublishedProjects()
  return projects.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const project = await getPublishedProject(params.slug)
  if (!project) return { title: 'Project not found · Stephen Onochie' }
  const title = `${project.title} · Stephen Onochie`
  return {
    title,
    description: project.summary,
    alternates: { canonical: `${SITE_URL}/work/${project.slug}` },
    openGraph: {
      title,
      description: project.summary,
      url: `${SITE_URL}/work/${project.slug}`,
      type: 'article',
      ...(project.coverUrl ? { images: [project.coverUrl] } : {}),
    },
  }
}

export default async function ProjectPage({ params }: { params: { slug: string } }) {
  const projects = await getPublishedProjects()
  const index = projects.findIndex(p => p.slug === params.slug)
  if (index === -1) notFound()
  const project = projects[index]
  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : null

  return (
    <PortfolioShell>
      <SiteHeader />
      <main id="main">
        <article>
          <header className={`${CONTAINER} pt-10 md:pt-14`}>
            <Link
              href="/#work"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-pf-muted hover:text-pf-text"
            >
              <ArrowLeft size={13} aria-hidden="true" /> All work
            </Link>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-pf-faint">{project.eyebrow}</p>
            <h1 className="mt-3 font-display uppercase leading-[0.9] text-pf-text text-[clamp(3rem,8vw,6rem)]">
              {project.title}
            </h1>
            <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-pf-muted">{project.summary}</p>
            {project.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-1.5">
                {project.tags.map(t => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            )}

            {project.facts.length > 0 && (
              <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 border-y border-pf-line">
                {project.facts.map((f, i) => (
                  <div
                    key={`${f.label}-${i}`}
                    className="py-4 pr-4 md:pl-5 md:first:pl-0 md:border-l md:first:border-l-0 border-pf-line [&:nth-child(n+3)]:border-t md:[&:nth-child(n+3)]:border-t-0 md:[&:nth-child(n+5)]:border-t"
                  >
                    <dt className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-pf-faint">{f.label}</dt>
                    <dd className="mt-1 text-[14.5px] text-pf-text">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </header>

          {project.coverUrl && (
            <div className={`${CONTAINER} mt-10`}>
              <ProjectMedia project={project} index={index} className="rounded-xl border border-pf-card-line" />
            </div>
          )}

          <div className={`${CONTAINER} pt-10 pb-12 md:pt-12 md:pb-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px]`}>
            <div className="max-w-[68ch]">
              <Markdown source={project.body} />

              {project.gallery.length > 0 && (
                <div className="mt-12 grid gap-5 sm:grid-cols-2">
                  {project.gallery.map(img => (
                    <figure key={img.url}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.caption}
                        loading="lazy"
                        className="w-full rounded-lg border border-pf-line object-cover"
                      />
                      {img.caption && (
                        <figcaption className="mt-2 font-mono text-[11px] text-pf-faint">{img.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </div>

            {project.links.length > 0 && (
              <aside aria-label="Project links" className="lg:pt-2">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-pf-faint">Links</p>
                <ul className="mt-3 border-t border-pf-line">
                  {project.links.map(l => (
                    <li key={l.url} className="border-b border-pf-line">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-track="project-page-link"
                        className="flex items-center justify-between gap-3 py-3 text-[14.5px] text-pf-text hover:text-pf-accent-text"
                      >
                        {l.label} <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </article>

        {next && (
          <nav aria-label="Next project" className={`${CONTAINER} pb-16 md:pb-24`}>
            <Link
              href={`/work/${next.slug}`}
              data-track={projectClickTarget(next.slug)}
              className="group flex items-center justify-between gap-6 border-y border-pf-line py-6"
            >
              <span>
                <span className="block font-mono text-[10.5px] uppercase tracking-[0.22em] text-pf-faint">
                  Next project
                </span>
                <span className="mt-1 block font-display uppercase text-[clamp(2rem,4vw,3rem)] leading-none text-pf-text group-hover:text-pf-accent-text transition-colors">
                  {next.title}
                </span>
              </span>
              <ArrowRight
                size={22}
                className="shrink-0 text-pf-text transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </nav>
        )}
      </main>
      <Contact />
    </PortfolioShell>
  )
}
