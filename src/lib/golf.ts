/** Returns strokes received for a player on a hole */
export function strokesReceived(courseHcp: number, holeStrokeIndex: number): number {
  let s = 0
  if (holeStrokeIndex <= courseHcp) s++
  if (holeStrokeIndex <= courseHcp - 18) s++
  return s
}

/** Course handicap calculation */
export function courseHandicap(index: number, slope: number, cr: number, par: number): number {
  return Math.round(index * (slope / 113) + (cr - par))
}

/** Stableford points per hole */
export function stablefordPts(gross: number, par: number, strokesRcv: number): number {
  const net = gross - strokesRcv
  return Math.max(0, 2 + (par - net))
}

/** Score differential for WHS */
export function scoreDifferential(ags: number, cr: number, slope: number): number {
  return (113 / slope) * (ags - cr)
}

/** Handicap index from sorted differentials (progressive table) */
export function handicapIndex(diffs: number[]): number {
  const n = diffs.length
  const sorted = [...diffs].sort((a, b) => a - b)
  let count = 0
  if (n >= 20) count = 8
  else if (n >= 19) count = 7
  else if (n >= 17) count = 6
  else if (n >= 15) count = 5
  else if (n >= 12) count = 4
  else if (n >= 9) count = 3
  else if (n >= 6) count = 2
  else if (n >= 4) count = 1
  else return -1 // not enough rounds
  const best = sorted.slice(0, count)
  return Math.round((best.reduce((a, b) => a + b, 0) / count) * 10) / 10
}

/** F1 league points */
export const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

/** How many players score points in a league round */
export function leagueScorers(nPlayers: number): number {
  return Math.ceil(nPlayers / 2)
}

/** Score label relative to par */
export function scoreLabel(s: number, par: number): string {
  if (s === 1) return 'Hoyo en 1'
  const delta = s - par
  if (delta <= -2) return 'Águila'
  if (delta === -1) return 'Birdie'
  if (delta === 0) return 'Par'
  if (delta === 1) return 'Bogey'
  if (delta === 2) return 'Doble'
  if (delta === 3) return 'Triple'
  return `+${delta}`
}

/** Tailwind class string for score chip based on delta vs par */
export function scoreChipClass(delta: number): string {
  if (delta <= -1) return 'bg-[#dde7fb] text-[#2a6fdb]'
  if (delta === 0) return 'bg-[#d9eedd] text-[#1f8a5b]'
  if (delta === 1) return 'bg-[#f6e6c4] text-[#9b6e1a]'
  return 'bg-[#fadcd6] text-[#a83a25]'
}

/** Score chip inline style colors */
export function scoreChipColors(delta: number): { bg: string; text: string } {
  if (delta <= -1) return { bg: '#dde7fb', text: '#2a6fdb' }
  if (delta === 0) return { bg: '#d9eedd', text: '#1f8a5b' }
  if (delta === 1) return { bg: '#f6e6c4', text: '#9b6e1a' }
  return { bg: '#fadcd6', text: '#a83a25' }
}

/** First letter of name, uppercase */
export function getPlayerInitial(name: string): string {
  return (name ?? '?')[0].toUpperCase()
}

/** Format handicap index nicely */
export function formatHandicap(index: number | null | undefined): string {
  if (index == null) return '—'
  if (index < 0) return `+${Math.abs(index).toFixed(1)}`
  return index.toFixed(1)
}
