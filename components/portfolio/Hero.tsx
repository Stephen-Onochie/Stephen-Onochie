export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-beige px-6 py-24">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="font-playfair text-6xl md:text-8xl font-bold text-textPrimary leading-tight mb-4">
          Stephen Onochie
        </h1>
        {/* Gold accent underline */}
        <div className="flex justify-center mb-8">
          <div className="h-1 w-32 bg-gold rounded-full" />
        </div>
        <p className="text-xl md:text-2xl text-textMuted font-inter font-light leading-relaxed">
          Builder at the intersection of business and technology.
        </p>
        <div className="mt-12 flex justify-center gap-4">
          <a
            href="#about"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white font-inter font-medium rounded-lg hover:bg-brownAccent transition-colors duration-200 min-h-[44px]"
          >
            Learn More
          </a>
          <a
            href="https://github.com/Stephen-Onochie"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gold text-gold font-inter font-medium rounded-lg hover:bg-surface transition-colors duration-200 min-h-[44px]"
          >
            GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
