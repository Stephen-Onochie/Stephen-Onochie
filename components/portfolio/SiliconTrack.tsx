import { SILICON } from '@/lib/portfolio/content'
import { CONTAINER, SectionLabel } from './ui'

const STATE_LABEL = { now: 'Now', planned: 'Planned', next: 'Next' } as const

export default function SiliconTrack() {
  return (
    <section id="silicon" aria-labelledby="silicon-title" className="scroll-mt-16 bg-pf-band border-y border-pf-line">
      <div className={`${CONTAINER} py-16 md:py-20 grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-14`}>
        <div>
          <SectionLabel index="02">Silicon track</SectionLabel>
          <h2
            id="silicon-title"
            className="font-display uppercase leading-[0.92] text-pf-text text-[clamp(2.4rem,5.2vw,3.6rem)] mt-2"
          >
            {SILICON.heading.map(l => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-pf-muted max-w-sm">{SILICON.intro}</p>
        </div>

        <ol className="grid sm:grid-cols-3 border-t border-pf-line">
          {SILICON.steps.map(step => (
            <li
              key={step.title}
              className="pt-5 pb-6 sm:pr-6 sm:pl-6 sm:first:pl-0 border-b sm:border-b-0 sm:border-l sm:first:border-l-0 border-pf-line"
            >
              <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-pf-faint">
                {step.when} · {STATE_LABEL[step.state]}
              </p>
              <span
                aria-hidden="true"
                className={`mt-3 block w-3 h-3 rounded-full border-2 ${
                  step.state === 'now' ? 'bg-pf-accent border-pf-accent' : 'border-pf-muted'
                }`}
              />
              <h3 className="mt-3 text-[16px] font-semibold text-pf-text">{step.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-pf-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
