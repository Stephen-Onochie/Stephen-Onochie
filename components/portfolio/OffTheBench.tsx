import { ArrowUpRight } from 'lucide-react'
import { AGENCY } from '@/lib/portfolio/content'
import CurrentlyReadingCard from './CurrentlyReadingCard'
import CurrentlyWatchingCard from './CurrentlyWatchingCard'
import { CONTAINER, SectionLabel, SectionTitle } from './ui'

export default function OffTheBench() {
  return (
    <section aria-labelledby="bench-title" className={`${CONTAINER} pb-16 md:pb-24`}>
      <div className="border-b border-pf-line pb-6">
        <SectionLabel index="04">Off the bench</SectionLabel>
        <SectionTitle>
          <span id="bench-title">Reading, watching, running a business</span>
        </SectionTitle>
      </div>

      {/* Reading/Watching render null when hidden or empty; auto-cols-fr lets the
          remaining cards share the row instead of leaving gaps. */}
      <div className="mt-8 grid gap-5 md:grid-flow-col md:auto-cols-fr">
        <CurrentlyReadingCard />
        <CurrentlyWatchingCard />
        <a
          href={AGENCY.url}
          target="_blank"
          rel="noopener noreferrer"
          data-track="agency-portal"
          className="group min-w-0 rounded-xl border border-pf-line bg-pf-card p-5 flex flex-col hover:border-pf-accent transition-colors"
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-pf-accent-text">{AGENCY.kicker}</p>
          <h3 className="mt-2 font-display uppercase text-[1.6rem] leading-none text-pf-text">{AGENCY.name}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-pf-muted">{AGENCY.text}</p>
          <span className="mt-auto pt-4 inline-flex items-center gap-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-pf-text group-hover:text-pf-accent-text">
            sitesbystephen.com <ArrowUpRight size={13} aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  )
}
