import type { Metadata } from 'next'
import Link from 'next/link'
import PortfolioFonts from '@/components/portfolio/PortfolioFonts'
import PublicSettingsProvider from '@/components/portfolio/PublicSettingsProvider'
import SiteHeader from '@/components/portfolio/SiteHeader'
import Footer from '@/components/portfolio/Footer'

export const metadata: Metadata = {
  title: 'Playground · Stephen Onochie',
  description: 'Interactive toys, experiments, and works in progress.',
}

export default function PlaygroundPage() {
  return (
    <PortfolioFonts>
      <PublicSettingsProvider>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main className="flex-1">
            <section className="border-b border-grid">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] border-b border-grid">
                <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-grid flex flex-col justify-center">
                  <h1 className="font-display text-3xl md:text-4xl uppercase tracking-wide text-textPrimary">
                    Playground
                  </h1>
                </div>
                <div className="p-6 md:p-8 font-mono text-xs text-textMuted uppercase tracking-[0.2em] flex items-center">
                  Interactive toys · experiments · works in progress
                </div>
              </div>

              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-grid border border-grid">
                  <div className="bg-beige">
                    <Link
                      href="/playground/room"
                      className="group flex min-h-[220px] flex-col border border-grid bg-beige p-5 transition-colors duration-200 hover:border-gold hover:bg-surface md:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted">
                          3D · Interactive
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 border border-grid text-gold">
                          Live
                        </span>
                      </div>
                      <h2 className="mt-4 font-playfair text-2xl font-semibold text-textPrimary transition-colors duration-200 group-hover:text-gold">
                        Dorm OS
                      </h2>
                      <p className="mt-3 flex-1 text-xs leading-relaxed text-textMuted">
                        Stephen&rsquo;s Wiley Hall room in spinnable low-poly 3D. Poke the
                        string lights, wake the computer, flip day to night, drag the
                        furniture around.
                      </p>
                      <div className="mt-4 border-t border-grid pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                        Enter room →
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </main>
          <Footer />
        </div>
      </PublicSettingsProvider>
    </PortfolioFonts>
  )
}
