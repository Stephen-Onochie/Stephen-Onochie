import type { PortfolioProject } from '@/types/portfolio'
import { WORK } from '@/lib/portfolio/content'
import ProjectCard from './ProjectCard'
import RepoArchive from './RepoArchive'
import SettingsLink from './SettingsLink'
import { CONTAINER, SectionLabel, SectionTitle } from './ui'

export default function SelectedWork({ projects }: { projects: PortfolioProject[] }) {
  return (
    <section id="work" aria-labelledby="work-title" className={`${CONTAINER} scroll-mt-20 py-16 md:py-24`}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-pf-line pb-6">
        <div>
          <SectionLabel index="01">Selected work</SectionLabel>
          <SectionTitle>
            <span id="work-title">{WORK.heading}</span>
          </SectionTitle>
        </div>
        <SettingsLink
          field="githubUrl"
          track="github-profile"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-pf-text underline underline-offset-4 decoration-pf-line hover:decoration-pf-accent"
        >
          All repos on GitHub ↗
        </SettingsLink>
      </div>

      {projects.length > 0 && (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {projects.map((p, i) => (
            <ProjectCard key={p.slug} project={p} index={i} />
          ))}
        </div>
      )}

      <div className="mt-8 border-y border-pf-line py-4 grid gap-3 sm:grid-cols-[100px_1fr] items-baseline">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-pf-faint">Archive</p>
        <ul className="flex flex-wrap gap-x-7 gap-y-2 text-[13.5px] text-pf-muted">
          {WORK.archive.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <RepoArchive />
    </section>
  )
}
