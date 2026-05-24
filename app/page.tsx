import PortfolioFonts from '@/components/portfolio/PortfolioFonts'
import SiteHeader from '@/components/portfolio/SiteHeader'
import Hero from '@/components/portfolio/Hero'
import GridMatrix from '@/components/portfolio/GridMatrix'
import GitHubSection from '@/components/portfolio/GitHubSection'
import ResumeCTA from '@/components/portfolio/ResumeCTA'
import Footer from '@/components/portfolio/Footer'

export default function Home() {
  return (
    <PortfolioFonts>
      <SiteHeader />
      <main>
        <Hero />
        <GridMatrix />
        <GitHubSection />
        <ResumeCTA />
      </main>
      <Footer />
    </PortfolioFonts>
  )
}
