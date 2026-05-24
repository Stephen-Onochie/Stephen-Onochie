import { Bebas_Neue, IBM_Plex_Mono } from 'next/font/google'

const display = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function PortfolioFonts({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${display.variable} ${mono.variable} font-mono bg-beige text-textPrimary min-h-screen`}
    >
      {children}
    </div>
  )
}
