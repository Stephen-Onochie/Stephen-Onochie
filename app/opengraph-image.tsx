import { ImageResponse } from 'next/og'

export const alt = 'Stephen Onochie: Chip Design & Embedded Systems'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Link preview for LinkedIn, iMessage, Slack. Uses the default font so the
// image never depends on a network fetch at build time.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#15110D',
          backgroundImage:
            'linear-gradient(180deg, #C9A84C14 1px, transparent 1px), linear-gradient(90deg, #C9A84C14 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          color: '#F2EADB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg width="56" height="52" viewBox="78 110 849 785" fill="#F2EADB">
            <path d="M78 110H480V304L343 347V241H208V456L480 371V895H78V701L208 660V771H342V552L78 634Z" />
            <path fillRule="evenodd" d="M527 110H927V895H527ZM657 241V771H790V241Z" />
          </svg>
          <div style={{ fontSize: 26, letterSpacing: 6, textTransform: 'uppercase' }}>Stephen Onochie</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 24, letterSpacing: 4, color: '#D9BC67', textTransform: 'uppercase' }}>
            Computer Engineering · Purdue
          </div>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1, marginTop: 18, letterSpacing: -2 }}>
            Chip design &amp; embedded systems
          </div>
          <div style={{ fontSize: 28, color: '#BDAE96', marginTop: 26 }}>
            Open to Summer 2027 internships · stephenonochie.com
          </div>
        </div>
      </div>
    ),
    size
  )
}
