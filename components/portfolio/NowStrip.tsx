import { NOW } from '@/lib/portfolio/content'
import { CONTAINER } from './ui'

export default function NowStrip() {
  return (
    <section aria-label="What I'm working on now" className="bg-pf-strip text-pf-strip-text">
      <div className={`${CONTAINER} grid sm:grid-cols-[150px_repeat(3,1fr)]`}>
        <p className="py-4 sm:py-6 font-mono text-[11px] uppercase tracking-[0.22em] text-pf-strip-faint flex items-center">
          {NOW.label}
        </p>
        {NOW.items.map(item => (
          <div key={item.text} className="py-4 sm:py-6 sm:pl-6 border-t sm:border-t-0 sm:border-l border-pf-strip-line">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-pf-strip-faint">{item.kind}</p>
            <p className="mt-1.5 text-[14px] leading-snug">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
