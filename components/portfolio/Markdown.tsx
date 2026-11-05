import { Fragment, type ReactNode } from 'react'

// Small, dependency-free Markdown subset for project write-ups: ## / ###
// headings, paragraphs, - and 1. lists, **bold**, *italic*, `code` and
// [links](https://…). Builds React elements, never raw HTML, so owner-entered
// text can't inject markup.

type Block =
  | { kind: 'h2' | 'h3' | 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null

  const flush = () => {
    if (para.length) blocks.push({ kind: 'p', text: para.join(' ') })
    para = []
    if (list) blocks.push(list)
    list = null
  }

  for (const raw of src.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    const heading = /^(#{2,3})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ kind: heading[1].length === 2 ? 'h2' : 'h3', text: heading[2] })
      continue
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)
    const item = bullet ?? numbered
    if (item) {
      const kind = bullet ? 'ul' : 'ol'
      if (para.length) {
        blocks.push({ kind: 'p', text: para.join(' ') })
        para = []
      }
      if (!list || list.kind !== kind) {
        if (list) blocks.push(list)
        list = { kind, items: [] }
      }
      list.items.push(item[1])
      continue
    }
    if (list) {
      // A wrapped line continues the previous list item.
      list.items[list.items.length - 1] += ` ${line}`
      continue
    }
    para.push(line)
  }
  flush()
  return blocks
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-pf-text">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="font-mono text-[0.88em] px-1 py-0.5 rounded bg-pf-card border border-pf-line">
          {part.slice(1, -1)}
        </code>
      )
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
    if (link) {
      const href = /^(https?:|mailto:|\/)/.test(link[2]) ? link[2] : '#'
      const external = href.startsWith('http')
      return (
        <a
          key={i}
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-pf-text underline underline-offset-4 decoration-pf-accent hover:text-pf-accent-text"
        >
          {link[1]}
        </a>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

export default function Markdown({ source }: { source: string }) {
  return (
    <div className="pf-prose text-[16.5px] leading-[1.75] text-pf-muted">
      {parseBlocks(source).map((b, i) => {
        switch (b.kind) {
          case 'h2':
            return (
              <h2 key={i} className="font-display uppercase text-[2rem] leading-none text-pf-text">
                {inline(b.text)}
              </h2>
            )
          case 'h3':
            return (
              <h3 key={i} className="text-[17px] font-semibold text-pf-text">
                {inline(b.text)}
              </h3>
            )
          case 'ul':
            return (
              <ul key={i} className="space-y-2 pl-5 list-disc marker:text-pf-accent">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="space-y-2 pl-5 list-decimal marker:text-pf-accent-text marker:font-mono">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            )
          default:
            return <p key={i}>{inline(b.text)}</p>
        }
      })}
    </div>
  )
}
