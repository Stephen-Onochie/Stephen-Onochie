'use client'

import { usePublicSettings } from './PublicSettingsProvider'

type LinkField = 'githubUrl' | 'linkedinUrl' | 'resumeUrl'

export default function SettingsLink({
  field,
  track,
  className,
  children,
}: {
  field: LinkField
  track: string
  className?: string
  children: React.ReactNode
}) {
  const settings = usePublicSettings()
  return (
    <a href={settings[field]} target="_blank" rel="noopener noreferrer" data-track={track} className={className}>
      {children}
    </a>
  )
}
