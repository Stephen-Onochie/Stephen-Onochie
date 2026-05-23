export default function About() {
  return (
    <section id="about" className="py-20 px-6 bg-beige">
      <div className="max-w-3xl mx-auto">
        <div className="border-l-4 border-gold pl-8">
          <h2 className="font-playfair text-4xl md:text-5xl font-bold text-textPrimary mb-6">
            About
          </h2>
          <p className="text-lg md:text-xl text-textMuted font-inter leading-relaxed">
            Stephen is an entrepreneur and developer focused on building software
            products and digital agencies. He is the founder of{' '}
            <span className="text-brownAccent font-medium">SBS Digital</span>, a
            web design and automations agency, and{' '}
            <span className="text-brownAccent font-medium">Blockd2d</span>.
          </p>
        </div>
      </div>
    </section>
  )
}
