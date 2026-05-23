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
      },
      fontFamily: {
        inter: ['var(--font-inter)', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
