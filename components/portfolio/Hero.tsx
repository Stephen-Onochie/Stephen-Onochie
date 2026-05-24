import Image from 'next/image'

export default function Hero() {
  return (
    <section className="border-b border-grid">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <div className="border-b lg:border-b-0 lg:border-r border-grid aspect-square max-h-[min(100vw,420px)] lg:max-h-none lg:min-h-[420px] bg-surface flex flex-col justify-end p-6 md:p-8">
          <div className="flex-1 flex items-center justify-center my-4 min-h-[180px]">
            <div className="relative w-[220px] h-[220px] md:w-[260px] md:h-[260px] rounded-full border border-grid overflow-hidden bg-beige">
              <Image
                src="/headshot.png"
                alt="Stephen Onochie"
                width={280}
                height={280}
                className="w-full h-full object-cover object-center"
                priority
              />
            </div>
          </div>
          <p className="font-mono text-xs text-textMuted leading-relaxed">
            West Lafayette, IN · Computer Engineering
          </p>
        </div>

        <div className="flex flex-col justify-center px-6 md:px-10 lg:px-14 py-12 md:py-16 lg:py-20">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-gold mb-4 md:mb-6">
            Purdue University
          </p>
          <h1 className="font-display text-[clamp(3rem,12vw,7.5rem)] leading-[0.9] uppercase text-textPrimary tracking-tight">
            Computer
            <br />
            Engineer
          </h1>
          <div className="w-full h-px bg-grid my-8 md:my-10" />
          <p className="font-mono text-sm md:text-base text-textMuted leading-relaxed max-w-2xl">
            Stephen builds at the intersection of rigorous software engineering and
            premium digital products — from automation and full-stack systems to the
            client work led through{' '}
            <span className="text-textPrimary">SBS Digital LLC</span>, a web design and
            automations agency.
          </p>
        </div>
      </div>
    </section>
  )
}
