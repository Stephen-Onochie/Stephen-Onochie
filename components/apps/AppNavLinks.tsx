import Link from 'next/link'

export default function AppNavLinks() {
  return (
    <nav
      className="flex items-center gap-3 font-inter text-sm text-textMuted"
      aria-label="App navigation"
    >
      <Link
        href="/apps"
        className="inline-flex items-center gap-1.5 hover:text-brownAccent transition-colors duration-200"
      >
        <span aria-hidden="true">←</span>
        My Apps
      </Link>
      <span aria-hidden="true" className="text-goldLight">
        ·
      </span>
      <Link href="/" className="hover:text-brownAccent transition-colors duration-200">
        Home
      </Link>
    </nav>
  )
}
