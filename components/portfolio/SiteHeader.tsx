import Link from 'next/link'
import AppsLogoLink from '@/components/auth/AppsLogoLink'
import SocialNav from './SocialNav'

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
          <SocialNav variant="desktop" />

          <div className="flex items-center gap-0 pl-2 pr-2 md:pr-3">
            <AppsLogoLink />
          </div>
        </div>
      </div>

      <SocialNav variant="mobile" />
    </header>
  )
}
