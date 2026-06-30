'use client'

import { usePublicSettings } from './PublicSettingsProvider'

export default function ResumeCTA() {
  const { resumeUrl, resumeHeading, resumeBlurb } = usePublicSettings()
  return (
    <section id="resume" className="border-b border-grid">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-grid flex flex-col justify-center">
          <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide text-textPrimary">
            {resumeHeading}
          </h2>
          <p className="font-mono text-sm text-textMuted mt-4 leading-relaxed max-w-md">
            {resumeBlurb}
          </p>
        </div>
        <div className="p-8 md:p-12 flex items-center justify-center bg-surface">
          <a
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs uppercase tracking-[0.3em] text-textPrimary border border-grid px-8 py-4 hover:border-gold hover:text-gold bg-beige transition-colors duration-200"
          >
            View Resume →
          </a>
        </div>
      </div>
    </section>
  )
}
