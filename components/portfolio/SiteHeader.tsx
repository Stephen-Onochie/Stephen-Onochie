import Image from 'next/image'
import Link from 'next/link'

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/Stephen-Onochie' },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/stephen-onochie-305760235' },
  { label: 'Instagram', href: 'https://www.instagram.com/stephenconochie/' },
] as const

const ticker =
  'COMPUTER ENGINEER · PURDUE · SBS DIGITAL LLC · AUTOMATION · FULL-STACK · EMBEDDED SYSTEMS · '

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-beige border-b border-grid">
      <div className="grid grid-cols-[auto_1fr_auto] items-stretch min-h-[3.25rem]">
        <Link
          href="/"
          className="flex items-center border-r border-grid px-4 md:px-6 py-3 font-display text-sm md:text-base tracking-[0.2em] uppercase text-textPrimary hover:text-gold transition-colors duration-200"
        >
          Stephen Onochie
        </Link>

        <div className="relative overflow-hidden border-r border-grid flex items-center min-w-0">
          <div className="portfolio-ticker flex whitespace-nowrap text-[10px] md:text-xs uppercase tracking-[0.25em] text-textMuted">
            <span>{ticker}</span>
            <span aria-hidden="true">{ticker}</span>
          </div>
        </div>

        <div className="flex items-stretch">
          <nav
            className="hidden sm:flex items-stretch border-r border-grid"
            aria-label="Social links"
          >
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 md:px-4 text-[10px] uppercase tracking-[0.2em] text-textMuted border-r border-grid last:border-r-0 hover:text-gold hover:bg-surface transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-0 pl-2 pr-2 md:pr-3">
            <Link
              href="/login"
              className="group relative flex items-center justify-center w-11 h-11 md:w-12 md:h-12 border border-transparent hover:border-grid transition-colors duration-200"
              aria-label="Private apps sign in"
              title="Apps"
            >
              <Image
                src="/logo-so.png"
                alt="SO monogram"
                width={40}
                height={40}
                className="w-8 h-8 md:w-9 md:h-9 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-200"
                priority
              />
              <span
                className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-gold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>

      <nav
        className="sm:hidden flex border-t border-grid"
        aria-label="Social links mobile"
      >
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2 text-[10px] uppercase tracking-[0.2em] text-textMuted border-r border-grid last:border-r-0 hover:text-gold hover:bg-surface transition-colors duration-200"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
