import { CONTACT, CONTACT_EMAIL } from '@/lib/portfolio/content'
import SettingsLink from './SettingsLink'
import Footer from './Footer'
import { CONTAINER } from './ui'

const OUTLINE =
  'inline-flex items-center justify-center h-11 px-5 rounded-md border border-pf-contact-line text-pf-contact-text text-[14px] font-medium hover:border-pf-accent transition-colors'

// Contact band and footer share the dark band in both themes.
export default function Contact({ showPitch = true }: { showPitch?: boolean }) {
  return (
    <div className="bg-pf-contact text-pf-contact-text">
      {showPitch && (
        <section
          id="contact"
          aria-labelledby="contact-title"
          className={`${CONTAINER} scroll-mt-16 pt-16 md:pt-24 pb-14 md:pb-20`}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-pf-contact-muted">
            <span className="text-pf-accent">05 · </span>Contact
          </p>
          <h2
            id="contact-title"
            className="mt-3 font-display uppercase leading-[0.9] text-[clamp(2.8rem,8vw,6rem)]"
          >
            {CONTACT.heading.map(l => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </h2>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-pf-contact-muted">{CONTACT.focus}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              data-track="contact-email"
              className="inline-flex items-center justify-center h-11 px-5 rounded-md bg-pf-accent text-pf-on-accent text-[14px] font-medium hover:brightness-110 transition"
            >
              {CONTACT_EMAIL}
            </a>
            <SettingsLink field="resumeUrl" track="contact-resume" className={OUTLINE}>
              Résumé
            </SettingsLink>
            <SettingsLink field="linkedinUrl" track="contact-linkedin" className={OUTLINE}>
              LinkedIn
            </SettingsLink>
            <SettingsLink field="githubUrl" track="contact-github" className={OUTLINE}>
              GitHub
            </SettingsLink>
          </div>
        </section>
      )}
      <Footer />
    </div>
  )
}
