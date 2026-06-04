const LINKEDIN_URL = 'https://www.linkedin.com/in/stephenonochie'
const LINKEDIN_HANDLE = 'stephenonochie'

export default function LinkedInCard() {
  return (
    <div className="flex-1 border border-grid bg-beige overflow-hidden min-h-[320px] flex flex-col">
      <div className="flex-1 bg-textPrimary p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 flex items-center justify-center bg-[#0A66C2] shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                LinkedIn
              </p>
              <p className="font-mono text-[10px] text-beige/60 mt-0.5">
                /in/{LINKEDIN_HANDLE}
              </p>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs text-beige/80 leading-relaxed">
            <p>
              <span className="text-gold mr-2">&gt;</span>
              Software &amp; Embedded Engineer
            </p>
            <p>
              <span className="text-gold mr-2">&gt;</span>
              Building AI tools &amp; web systems
            </p>
            <p>
              <span className="text-gold mr-2">&gt;</span>
              Founder, SBS Digital LLC
            </p>
          </div>
        </div>

        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-gold border-b border-gold pb-0.5 hover:text-brownAccent hover:border-brownAccent transition-colors duration-200 self-start"
        >
          Connect →
        </a>
      </div>
    </div>
  )
}
