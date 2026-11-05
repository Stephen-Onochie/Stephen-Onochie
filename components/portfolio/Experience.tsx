import { EXPERIENCE, TOOLS } from '@/lib/portfolio/content'
import { CONTAINER, SectionLabel, SectionTitle } from './ui'

export default function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-title" className={`${CONTAINER} scroll-mt-20 py-16 md:py-24`}>
      <div className="border-b border-pf-line pb-6">
        <SectionLabel index="03">Experience</SectionLabel>
        <SectionTitle>
          <span id="experience-title">Where I’ve shipped</span>
        </SectionTitle>
      </div>

      <ul>
        {EXPERIENCE.map(job => (
          <li
            key={`${job.org}-${job.role}`}
            className="grid gap-1.5 md:gap-8 md:grid-cols-[170px_minmax(0,240px)_1fr] py-5 border-b border-pf-line"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-pf-faint md:pt-1">{job.when}</p>
            <div>
              <h3 className="text-[15.5px] font-semibold text-pf-text">{job.role}</h3>
              <p className="text-[13.5px] text-pf-faint">{job.org}</p>
            </div>
            <p className="text-[14.5px] leading-relaxed text-pf-muted mt-1 md:mt-0">{job.detail}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-3 sm:grid-cols-[100px_1fr] items-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-pf-faint">Tools</p>
        <ul className="flex flex-wrap gap-2" aria-label="Tools">
          {TOOLS.solid.map(t => (
            <li
              key={t}
              className="inline-flex items-center h-7 px-2.5 rounded bg-pf-chip text-pf-chip-text font-mono text-[11.5px]"
            >
              {t}
            </li>
          ))}
          {TOOLS.learning.map(t => (
            <li
              key={t}
              className="inline-flex items-center h-7 px-2.5 rounded border border-dashed border-pf-muted text-pf-muted font-mono text-[11.5px]"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
