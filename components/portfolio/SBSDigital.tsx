export default function SBSDigital() {
  return (
    <section className="py-20 px-6 bg-beige">
      <div className="max-w-3xl mx-auto">
        <div className="border-2 border-gold rounded-2xl p-8 bg-surface shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gold flex items-center justify-center flex-shrink-0">
              <span className="text-white font-playfair font-bold text-lg">S</span>
            </div>
            <div>
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-textPrimary">
                SBS Digital
              </h2>
              <p className="text-gold font-inter font-medium text-sm mt-1 uppercase tracking-wider">
                Web Design &amp; Automations Agency
              </p>
            </div>
          </div>

          <p className="text-textMuted font-inter text-lg leading-relaxed mb-8">
            Building websites and automated workflows for businesses. SBS Digital
            helps companies grow their online presence and streamline their
            operations with modern web solutions.
          </p>

          {/* TODO: Replace href="#" with the real SBS Digital URL */}
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white font-inter font-medium rounded-lg hover:bg-brownAccent transition-colors duration-200 min-h-[44px]"
          >
            Visit SBS Digital
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
