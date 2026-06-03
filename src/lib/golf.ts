/** Returns score label relative to par */
export function scoreLabel(score: number, par: number): string {
  const delta = score - par
  if (delta <= -2) return 'Eagle'
  if (delta === -1) return 'Birdie'
  if (delta === 0) return 'Par'
  if (delta === 1) return 'Bogey'
  if (delta === 2) return 'Doble'
  if (delta === 3) return 'Triple'
  return `+${delta}`
}

/** Returns short score label (+1, E, -1, -2...) */
export function scoreShort(score: number, par: number): string {
  const delta = score - par
  if (delta === 0) return 'E'
  if (delta > 0) return `+${delta}`
  return `${delta}`
}

/** Returns bg and text color for score chip based on delta vs par */
export function scoreChipColors(delta: number): { bg: string; text: string; border?: string } {
  if (delta <= -2) return { bg: '#2a6fdb', text: '#ffffff' }          // Eagle: blue
  if (delta === -1) return { bg: '#2a6fdb', text: '#ffffff' }          // Birdie: blue
  if (delta === 0) return { bg: '#1f8a5b', text: '#ffffff' }           // Par: green
  if (delta === 1) return { bg: '#e8b75a', text: '#0e1a16' }           // Bogey: amber
  if (delta === 2) return { bg: '#f87171', text: '#ffffff' }           // Double: red
  return { bg: '#ef4444', text: '#ffffff' }                            // Triple+: red
}

/** How many strokes a player receives on a given hole */
export function strokesReceived(courseHcp: number, holeHcpIdx: number): number {
  if (courseHcp <= 0) return 0
  const full = Math.floor(courseHcp / 18)
  const extra = courseHcp % 18
  return full + (holeHcpIdx <= extra ? 1 : 0)
}

/** Stableford points for a hole */
export function stablefordPts(gross: number, par: number, strokesRcv: number): number {
  const net = gross - strokesRcv
  return Math.max(0, 2 + (par - net))
}

/** Score differential for a round */
export function scoreDifferential(ags: number, cr: number, slope: number): number {
  return (113 / slope) * (ags - cr)
}

/** Handicap index: average of 8 lowest of last 20 differentials */
export function handicapIndex(diffs: number[]): number {
  const last20 = diffs.slice(-20)
  const sorted = [...last20].sort((a, b) => a - b)
  const best8 = sorted.slice(0, 8)
  const avg = best8.reduce((s, d) => s + d, 0) / best8.length
  return Math.round(avg * 10) / 10
}

/** Course handicap */
export function courseHandicap(index: number, slope: number, cr: number, par: number): number {
  return Math.round(index * (slope / 113) + (cr - par))
}

/** F1-style points allocation */
export const f1Points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

/** How many players score points in a league round */
export function leagueScorers(nPlayers: number): number {
  return Math.ceil(nPlayers / 2)
}
