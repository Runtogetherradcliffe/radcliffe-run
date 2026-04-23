import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:           '#0a0a0a',
        card:         '#111111',
        'card-hi':    '#1a1a1a',
        border:       '#1e1e1e',
        'border-2':   '#2a2a2a',
        orange:       '#f5a623',
        'orange-lt':  '#ffc966',
        'orange-dk':  '#c47d0e',
        dim:          '#aaaaaa',
        muted:        '#888888',
        faint:        '#555555',
        purple:       '#c4a8e8',
        'purple-bg':  '#0f0a1e',
        green:        '#7cb87c',
        'green-bg':   '#0a120a',
        blue:         '#6b9fd4',
        amber:        '#d4a84b',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'display': ['clamp(52px, 6.5vw, 86px)', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '800' }],
        'h1':      ['48px',  { lineHeight: '1.1',  letterSpacing: '-0.03em', fontWeight: '800' }],
        'h2':      ['32px',  { lineHeight: '1.2',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'h3':      ['22px',  { lineHeight: '1.3',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'label':   ['11px',  { lineHeight: '1',    letterSpacing: '0.12em',  fontWeight: '600' }],
        'body':    ['16px',  { lineHeight: '1.7',  letterSpacing: '0',       fontWeight: '300' }],
        'meta':    ['13px',  { lineHeight: '1.5',  letterSpacing: '0.02em',  fontWeight: '400' }],
        'micro':   ['11px',  { lineHeight: '1',    letterSpacing: '0.08em',  fontWeight: '500' }],
      },
      borderRadius: {
        card:   '12px',
        btn:    '8px',
        badge:  '5px',
        pill:   '20px',
        modal:  '16px',
        phone:  '44px',
      },
      maxWidth: {
        content: '1200px',
      },
      spacing: {
        '18': '72px',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
}

export default config
