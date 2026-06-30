'use client'

import { usePublicSettings } from './PublicSettingsProvider'

// Social links read from the live public settings. Split out of SiteHeader so the
// header itself can stay a server component (it renders the async AppsLogoLink).
export default function SocialNav({ variant }: { variant: 'desktop' | 'mobile' }) {
  const { githubUrl, linkedinUrl, instagramUrl } = usePublicSettings()
  const links = [
    { label: 'GitHub', href: githubUrl },
    { label: 'LinkedIn', href: linkedinUrl },
    { label: 'Instagram', href: instagramUrl },
  ]

  if (variant === 'mobile') {
    return (
      <nav className="sm:hidden flex border-t border-grid" aria-label="Social links mobile">
        {links.map(link => (
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
    )
  }

  return (
    <nav className="hidden sm:flex items-stretch border-r border-grid" aria-label="Social links">
      {links.map(link => (
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
  )
}
