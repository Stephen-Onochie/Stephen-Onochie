import Link from 'next/link'

export default function HomeLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 font-inter text-sm text-textMuted hover:text-brownAccent transition-colors duration-200"
    >
      <span aria-hidden="true">←</span>
      Home
    </Link>
  )
}
