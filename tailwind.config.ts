import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)',
        card: 'var(--c-card)',
        ink: 'var(--c-ink)',
        mute: 'var(--c-mute)',
        accent: 'var(--c-accent)',
        'accent-light': 'var(--c-accent-light)',
        blue: 'var(--c-blue)',
        'blue-light': 'var(--c-blue-light)',
        amber: 'var(--c-amber)',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        hero: '22px',
        card: '16px',
      },
      maxWidth: {
        mobile: '430px',
      },
    },
  },
  plugins: [],
}
export default config
