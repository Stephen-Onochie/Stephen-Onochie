export default function Footer() {
  return (
    <footer className="border-t border-grid">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-grid">
        <p className="px-6 py-5 font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted">
          © {new Date().getFullYear()} Stephen Onochie
        </p>
        <a
          href="mailto:stephenconochie@gmail.com"
          className="px-6 py-5 font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted hover:text-gold transition-colors duration-200 text-center md:text-left"
        >
          stephenconochie@gmail.com
        </a>
        <a
          href="https://github.com/Stephen-Onochie"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-5 font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted hover:text-gold transition-colors duration-200 text-center md:text-right"
        >
          GitHub →
        </a>
      </div>
    </footer>
  )
}
