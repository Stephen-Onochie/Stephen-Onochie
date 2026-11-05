import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        beige: '#F5F0E8',
        surface: '#EDE8DC',
        gold: '#C9A84C',
        goldLight: '#E2C97E',
        brownAccent: '#6B4F2A',
        textPrimary: '#2C1F0E',
        textMuted: '#8C7355',
        grid: '#B8A48E',
        pf: {
          bg: 'var(--pf-bg)',
          band: 'var(--pf-band)',
          card: 'var(--pf-card)',
          media: 'var(--pf-media)',
          'media-text': 'var(--pf-media-text)',
          line: 'var(--pf-line)',
          'card-line': 'var(--pf-card-line)',
          text: 'var(--pf-text)',
          muted: 'var(--pf-muted)',
          faint: 'var(--pf-faint)',
          accent: 'var(--pf-accent)',
          'accent-text': 'var(--pf-accent-text)',
          'on-accent': 'var(--pf-on-accent)',
          chip: 'var(--pf-chip)',
          'chip-text': 'var(--pf-chip-text)',
          strip: 'var(--pf-strip)',
          'strip-text': 'var(--pf-strip-text)',
          'strip-faint': 'var(--pf-strip-faint)',
          'strip-line': 'var(--pf-strip-line)',
          contact: 'var(--pf-contact)',
          'contact-text': 'var(--pf-contact-text)',
          'contact-muted': 'var(--pf-contact-muted)',
          'contact-line': 'var(--pf-contact-line)',
        },
      },
      fontFamily: {
        inter: ['var(--font-inter)', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'serif'],
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
