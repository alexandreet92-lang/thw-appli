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
