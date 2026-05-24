import InstagramFeed from '@/components/portfolio/InstagramFeed'

const stackGroups = [
  {
    label: 'Engineering',
    items: ['C / C++', 'Python', 'TypeScript', 'Embedded & IoT', 'Computer Vision'],
  },
  {
    label: 'Systems',
    items: ['Next.js', 'Node.js', 'Supabase', 'REST APIs', 'Workflow automation'],
  },
  {
    label: 'Focus',
    items: ['MCP servers', 'AI tooling', 'FTC robotics', 'Hardware integration'],
  },
] as const

export default function GridMatrix() {
  return (
    <section className="border-b border-grid">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Cell 1 — Technical stack */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-grid p-6 md:p-8 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between border-b border-grid pb-3 mb-6">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-wide text-textPrimary">
              Stack
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
              v1.0
            </span>
          </div>

          <div className="flex-1 border border-grid bg-textPrimary text-beige p-4 md:p-5 font-mono text-xs md:text-sm leading-relaxed overflow-hidden">
            <p className="text-gold mb-4 uppercase tracking-[0.15em]">
              $ whoami --engineer
            </p>
            {stackGroups.map((group) => (
              <div key={group.label} className="mb-5 last:mb-0">
                <p className="text-goldLight uppercase tracking-[0.2em] text-[10px] mb-2">
                  [{group.label}]
                </p>
                <ul className="space-y-1 text-beige/90">
                  {group.items.map((item) => (
                    <li key={item}>
                      <span className="text-gold mr-2">&gt;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Cell 2 — SBS Digital */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-grid p-6 md:p-8 flex flex-col min-h-[320px]">
          <div className="flex items-start justify-between gap-4 border-b border-grid pb-3 mb-6">
            <div>
              <h2 className="font-display text-2xl md:text-3xl uppercase tracking-wide text-textPrimary">
                SBS Digital LLC
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-textMuted mt-1">
                Agency · Web · Automations
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 border border-grid text-gold">
              Live
            </span>
          </div>

          <div className="flex-1 border border-grid bg-surface/80 backdrop-blur-[2px] p-0 flex flex-col">
            <div className="grid grid-cols-3 border-b border-grid text-[10px] uppercase tracking-[0.15em]">
              <div className="px-3 py-2 border-r border-grid text-textMuted">Clients</div>
              <div className="px-3 py-2 border-r border-grid text-textMuted">Projects</div>
              <div className="px-3 py-2 text-textMuted">Stack</div>
            </div>
            <div className="grid grid-cols-3 flex-1 min-h-[120px]">
              <div className="border-r border-grid p-4 font-mono text-2xl text-textPrimary">—</div>
              <div className="border-r border-grid p-4 font-mono text-2xl text-textPrimary">—</div>
              <div className="p-4 font-mono text-xs text-textMuted leading-relaxed">
                Next.js
                <br />
                n8n
                <br />
                Design
              </div>
            </div>
            <div className="border-t border-grid p-4 md:p-5">
              <p className="font-mono text-sm text-textMuted leading-relaxed mb-4">
                Premium websites and automated workflows for businesses ready to scale
                their online presence.
              </p>
              <a
                href="https://sitesbystephen.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-mono text-xs uppercase tracking-[0.25em] text-gold border-b border-gold pb-0.5 hover:text-brownAccent hover:border-brownAccent transition-colors duration-200"
              >
                Visit agency portal →
              </a>
            </div>
          </div>
        </div>

        {/* Cell 3 — Instagram */}
        <div className="lg:col-span-3 p-6 md:p-8 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between border-b border-grid pb-3 mb-6">
            <h2 className="font-display text-2xl uppercase tracking-wide text-textPrimary">
              Feed
            </h2>
            <a
              href="https://www.instagram.com/stephenconochie/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-textMuted hover:text-gold transition-colors duration-200"
            >
              @stephenconochie
            </a>
          </div>

          <InstagramFeed />
        </div>
      </div>
    </section>
  )
}
