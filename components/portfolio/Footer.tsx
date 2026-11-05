import Link from 'next/link'
import { CONTAINER } from './ui'

export default function Footer() {
  return (
    <footer className="border-t border-pf-contact-line">
      <div
        className={`${CONTAINER} py-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-pf-contact-muted`}
      >
        <p>
          © {new Date().getFullYear()} Stephen Onochie
          <span aria-hidden="true"> · </span>
          <Link href="/login" data-track="footer-signin" className="hover:text-pf-contact-text transition-colors">
            Sign in
          </Link>
        </p>
        <p>Built with Next.js · Deployed on Vercel</p>
      </div>
    </footer>
  )
}
