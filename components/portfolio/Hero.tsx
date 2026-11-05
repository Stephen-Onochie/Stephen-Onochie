import Image from 'next/image'
import { CONTACT_EMAIL, HERO } from '@/lib/portfolio/content'
import SettingsLink from './SettingsLink'
import { BTN_PRIMARY, BTN_SECONDARY, CONTAINER } from './ui'

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className={`${CONTAINER} pt-10 pb-14 md:pt-16 md:pb-20`}>
      <div className="grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] md:gap-12 lg:gap-16 items-start">
        <div className="flex md:flex-col gap-5 items-end md:items-stretch">
          <div className="relative w-[132px] sm:w-[160px] md:w-full aspect-[4/5] rounded-xl overflow-hidden border border-pf-card-line bg-pf-card shrink-0">
            <Image
              src="/headshot.jpg"
              alt="Stephen Onochie"
              fill
              sizes="(min-width: 1024px) 250px, (min-width: 768px) 220px, 160px"
              className="object-cover object-[60%_30%]"
              priority
            />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] leading-relaxed text-pf-faint">
            {HERO.location.map(line => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>

        <div className="md:pt-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-pf-faint">{HERO.eyebrow}</p>
          <h1
            id="hero-title"
            className="font-display uppercase text-pf-text leading-[0.88] tracking-[0.005em] text-[clamp(3.4rem,9vw,7rem)] mt-4"
          >
            {HERO.headline.map(line => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-[34rem] text-[16px] md:text-[17px] leading-relaxed text-pf-muted">{HERO.intro}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SettingsLink field="resumeUrl" track="hero-resume" className={BTN_PRIMARY}>
              View résumé
            </SettingsLink>
            <a href="#work" className={BTN_SECONDARY}>
              See the work
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              data-track="hero-email"
              className="ml-1 text-[14px] text-pf-muted underline underline-offset-4 decoration-pf-line hover:text-pf-text hover:decoration-pf-accent transition-colors"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
