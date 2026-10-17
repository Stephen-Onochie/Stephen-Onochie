import PortfolioFonts from '@/components/portfolio/PortfolioFonts'
import PublicSettingsProvider from '@/components/portfolio/PublicSettingsProvider'
import SiteHeader from '@/components/portfolio/SiteHeader'
import Hero from '@/components/portfolio/Hero'
import GridMatrix from '@/components/portfolio/GridMatrix'
import CurrentlyReadingCard from '@/components/portfolio/CurrentlyReadingCard'
import CurrentlyWatchingCard from '@/components/portfolio/CurrentlyWatchingCard'
import GitHubSection from '@/components/portfolio/GitHubSection'
import ResumeCTA from '@/components/portfolio/ResumeCTA'
import Footer from '@/components/portfolio/Footer'

export default function Home() {
  return (
    <PortfolioFonts>
      <PublicSettingsProvider>
        <SiteHeader />
        <main>
          <Hero />
          <GridMatrix />
          {/* Either card can render null (hidden or nothing featured). auto-cols-fr lets a
              lone card span the row, and empty:hidden drops the border when both are gone. */}
          <div className="grid grid-cols-1 md:grid-flow-col md:auto-cols-fr border-b border-grid divide-y md:divide-y-0 md:divide-x divide-grid empty:hidden">
            <CurrentlyReadingCard />
            <CurrentlyWatchingCard />
          </div>
          <GitHubSection />
          <ResumeCTA />
        </main>
        <Footer />
      </PublicSettingsProvider>
    </PortfolioFonts>
  )
}
