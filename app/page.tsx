import type { Metadata } from 'next'
import PortfolioShell from '@/components/portfolio/PortfolioShell'
import SiteHeader from '@/components/portfolio/SiteHeader'
import Hero from '@/components/portfolio/Hero'
import NowStrip from '@/components/portfolio/NowStrip'
import SelectedWork from '@/components/portfolio/SelectedWork'
import SiliconTrack from '@/components/portfolio/SiliconTrack'
import Experience from '@/components/portfolio/Experience'
import OffTheBench from '@/components/portfolio/OffTheBench'
import Contact from '@/components/portfolio/Contact'
import { getPublishedProjects } from '@/lib/portfolio/projects'
import { CONTACT_EMAIL, HERO, SITE_URL } from '@/lib/portfolio/content'

// Rebuilt hourly at most; Public View project saves revalidate immediately.
export const revalidate = 3600

const DESCRIPTION =
  'Computer Engineering student at Purdue focused on chip design and embedded systems: PCBs, firmware and the software around them. Open to Summer 2027 internships.'

export const metadata: Metadata = {
  title: 'Stephen Onochie · Chip Design & Embedded Systems',
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Stephen Onochie · Chip Design & Embedded Systems',
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'Stephen Onochie',
    type: 'profile',
  },
  twitter: { card: 'summary_large_image' },
}

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Stephen Onochie',
  url: SITE_URL,
  email: `mailto:${CONTACT_EMAIL}`,
  jobTitle: 'Computer Engineering Student',
  description: HERO.intro,
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'Purdue University' },
  address: { '@type': 'PostalAddress', addressLocality: 'West Lafayette', addressRegion: 'IN' },
  sameAs: ['https://github.com/Stephen-Onochie'],
}

export default async function Home() {
  const projects = await getPublishedProjects()
  return (
    <PortfolioShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <SiteHeader />
      <main id="main">
        <Hero />
        <NowStrip />
        <SelectedWork projects={projects} />
        <SiliconTrack />
        <Experience />
        <OffTheBench />
      </main>
      <Contact />
    </PortfolioShell>
  )
}
