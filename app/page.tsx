import Hero from '@/components/portfolio/Hero'
import About from '@/components/portfolio/About'
import SBSDigital from '@/components/portfolio/SBSDigital'
import GitHubSection from '@/components/portfolio/GitHubSection'
import ResumeCTA from '@/components/portfolio/ResumeCTA'
import Footer from '@/components/portfolio/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-beige">
      <Hero />
      <About />
      <SBSDigital />
      <GitHubSection />
      <ResumeCTA />
      <Footer />
    </main>
  )
}
