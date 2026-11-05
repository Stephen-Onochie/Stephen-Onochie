import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { PortfolioProject } from '@/types/portfolio'
import { projectClickTarget } from '@/lib/site-analytics/click-targets'
import { Tag } from './ui'

export function ProjectMedia({
  project,
  index,
  className = '',
}: {
  project: PortfolioProject
  index: number
  className?: string
}) {
  if (project.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={project.coverUrl} alt="" className={`w-full aspect-[16/9] object-cover ${className}`} />
    )
  }
  // No photo yet: a blueprint panel that reads as a deliberate design element.
  return (
    <div className={`pf-blueprint relative h-36 sm:h-44 overflow-hidden ${className}`} aria-hidden="true">
      <span className="absolute -bottom-5 right-4 font-display text-[8.5rem] leading-none text-pf-media-text opacity-25 select-none">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="absolute left-4 bottom-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-pf-media-text">
        [ {project.tags.slice(0, 2).join(' · ') || 'Project'} ]
      </span>
    </div>
  )
}

export default function ProjectCard({ project, index }: { project: PortfolioProject; index: number }) {
  return (
    <Link
      href={`/work/${project.slug}`}
      data-track={projectClickTarget(project.slug)}
      className="group flex flex-col rounded-xl border border-pf-card-line bg-pf-card overflow-hidden hover:border-pf-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pf-accent"
    >
      <ProjectMedia project={project} index={index} />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-pf-faint">{project.eyebrow}</p>
        <h3 className="mt-2 font-display uppercase text-[1.9rem] leading-none text-pf-text">{project.title}</h3>
        <p className="mt-3 text-[14.5px] leading-relaxed text-pf-muted">{project.summary}</p>
        <div className="mt-auto pt-5 flex items-end justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map(t => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-pf-text group-hover:text-pf-accent-text transition-colors">
            {project.linkLabel}
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  )
}
