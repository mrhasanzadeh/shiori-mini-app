import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shiori: {
          bg: '#06070b',
          surface: '#0e1018',
          border: 'rgba(255,255,255,0.08)',
        },
        primary: {
          DEFAULT: '#818cf8',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(129, 140, 248, 0.45)',
        'glow-sm': '0 0 24px -6px rgba(129, 140, 248, 0.35)',
        card: '0 8px 32px -8px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '48px 48px',
      },
    },
  },
  plugins: [],
}

export default config
