export function BenchCard({
  kicker,
  title,
  meta,
  imageUrl,
  progressPct,
  progressLabel,
}: {
  kicker: string
  title: string
  meta: string | null
  imageUrl: string | null
  progressPct: number | null
  progressLabel: string | null
}) {
  return (
    <article className="min-w-0 rounded-xl border border-pf-line bg-pf-card p-5 flex gap-5">
      <div className="w-20 shrink-0 aspect-[2/3] rounded-md overflow-hidden border border-pf-line pf-blueprint">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex flex-col">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-pf-accent-text">{kicker}</p>
        <h3 className="mt-2 font-display uppercase text-[1.6rem] leading-none text-pf-text">{title}</h3>
        {meta && <p className="mt-1.5 text-[13px] text-pf-muted">{meta}</p>}
        {progressLabel && (
          <div className="mt-auto pt-4">
            {progressPct != null && (
              <div className="h-1 rounded-full bg-pf-line overflow-hidden">
                <div className="h-full bg-pf-accent" style={{ width: `${progressPct}%` }} />
              </div>
            )}
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-pf-faint">{progressLabel}</p>
          </div>
        )}
      </div>
    </article>
  )
}
