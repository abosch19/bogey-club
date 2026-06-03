export const tokens = {
  colors: {
    bg: '#f4f1e9',
    card: '#ffffff',
    ink: '#0e1a16',
    mute: '#6b7a72',
    accent: '#1f8a5b',
    accentLight: '#d9eedd',
    blue: '#2a6fdb',
    blueLight: '#dde7fb',
    amber: '#e8b75a',
  },
  radius: {
    hero: '22px',
    card: '16px',
    pill: '999px',
  },
  spacing: {
    pagePad: '14px',
  },
  fontSize: {
    heroScore: '84px',
    heroScoreLg: '120px',
  },
} as const

export type TokenColor = keyof typeof tokens.colors
