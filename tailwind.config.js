/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00c8e0',
          vivid:   '#00e5ff',
          deep:    '#0099b8',
          purple:  '#5b6fff',
        },
        // CSS variable mappings — resolvent les classes bg-background, bg-card, etc.
        background:  'var(--bg)',
        foreground:  'var(--text)',
        card: {
          DEFAULT:    'var(--bg-card)',
          foreground: 'var(--text)',
        },
        muted: {
          DEFAULT:    'var(--bg-alt)',
          foreground: 'var(--text-mid)',
        },
        border: 'var(--border)',
        // shadcn/ui → design system : chaque rôle shadcn pointe sur un token existant
        // (une seule source de vérité ; thème clair/sombre géré par globals.css).
        primary:     { DEFAULT: 'var(--primary)',  foreground: 'var(--on-primary)' },
        secondary:   { DEFAULT: 'var(--bg-card2)', foreground: 'var(--text)' },
        accent:      { DEFAULT: 'var(--bg-hover)', foreground: 'var(--text)' },
        destructive: { DEFAULT: 'var(--danger)',   foreground: 'var(--on-primary)' },
        popover:     { DEFAULT: 'var(--bg-card)',  foreground: 'var(--text)' },
        input:       'var(--border-mid)',
        ring:        'var(--primary)',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        btn:  '10px',
        tag:  '7px',
      },
      boxShadow: {
        card:       'var(--shadow-card)',
        panel:      'var(--shadow)',
        brand:      '0 0 20px rgba(0,200,224,0.25)',
        'brand-sm': '0 0 10px rgba(0,200,224,0.18)',
      },
    },
  },
  plugins: [],
}
