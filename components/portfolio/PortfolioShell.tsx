import { Bebas_Neue, IBM_Plex_Mono } from 'next/font/google'
import PublicSettingsProvider from './PublicSettingsProvider'
import ClickTracker from './ClickTracker'

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

// Runs before first paint so a visitor who picked a theme never sees the other
// one flash; with no stored choice the CSS follows prefers-color-scheme.
const themeScript = `try{var t=localStorage.getItem('pf-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-pf-theme',t)}catch(e){}`

export default function PortfolioShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`pf ${display.variable} ${mono.variable} font-inter bg-pf-bg text-pf-text min-h-screen antialiased`}
    >
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-md focus:bg-pf-accent focus:text-pf-on-accent font-mono text-xs"
      >
        Skip to content
      </a>
      <PublicSettingsProvider>
        {children}
        <ClickTracker />
      </PublicSettingsProvider>
    </div>
  )
}
