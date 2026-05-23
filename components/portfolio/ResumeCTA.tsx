export default function ResumeCTA() {
  return (
    <section id="resume" className="py-20 px-6 bg-surface">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-textPrimary mb-4">
          Resume
        </h2>
        <p className="text-textMuted font-inter text-lg mb-8">
          Download my resume to learn more about my experience.
        </p>
        {/* TODO: Replace href with Supabase Storage URL once PDF is uploaded */}
        <a
          href="#"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-white font-inter font-semibold rounded-lg hover:bg-brownAccent transition-colors duration-200 min-h-[44px] text-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Resume
        </a>
      </div>
    </section>
  )
}
