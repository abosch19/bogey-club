// ─── Score labels ────────────────────────────────────────────
export function scoreLabel(strokes: number, par: number): string {
  if (strokes === 1) return 'Hoyo en uno'
  const d = strokes - par
  if (d <= -3) return 'Albatros'
  if (d === -2) return 'Eagle'
  if (d === -1) return 'Birdie'
  if (d === 0)  return 'Par'
  if (d === 1)  return 'Bogey'
  if (d === 2)  return 'Doble'
  return `+${d}`
}

export function scoreDelta(strokes: number, par: number): number {
  return strokes - par
}

// Returns Tailwind classes for score chip
export function scoreChipClass(delta: number): string {
  if (delta <= -1) return 'bg-[#dde7fb] text-[#2a6fdb]'
  if (delta === 0)  return 'bg-[#d9eedd] text-[#1f8a5b]'
  if (delta === 1)  return 'bg-[#f6e6c4] text-[#9b6e1a]'
  return 'bg-[#fadcd6] text-[#a83a25]'
}

// ─── Handicap helpers ────────────────────────────────────────
export function strokesReceived(courseHcp: number, holeStrokeIndex: number): number {
  let s = 0
  if (holeStrokeIndex <= courseHcp) s++
  if (holeStrokeIndex <= courseHcp - 18) s++
  return s
}

export function courseHandicap(index: number, slope: number, cr: number, par: number): number {
  return Math.round(index * (slope / 113) + (cr - par))
}

// ─── Stableford ──────────────────────────────────────────────
export function stablefordPts(gross: number, par: number, strokesRcv: number): number {
  const net = gross - strokesRcv
  return Math.max(0, 2 + (par - net))
}

// ─── WHS ─────────────────────────────────────────────────────
export function scoreDifferential(ags: number, cr: number, slope: number): number {
  return parseFloat(((113 / slope) * (ags - cr)).toFixed(2))
}

export function countingRounds(total: number): number {
  if (total >= 20) return 8
  if (total >= 19) return 7
  if (total >= 17) return 6
  if (total >= 15) return 5
  if (total >= 12) return 4
  if (total >= 9)  return 3
  if (total >= 6)  return 2
  if (total >= 4)  return 1
  return 0
}

export function calcHandicapIndex(differentials: number[]): number | null {
  const n = differentials.length
  const count = countingRounds(n)
  if (count === 0) return null
  const sorted = [...differentials].sort((a, b) => a - b)
  const best = sorted.slice(0, count)
  const avg = best.reduce((a, b) => a + b, 0) / count
  return parseFloat(avg.toFixed(1))
}

// ─── Liga ────────────────────────────────────────────────────
export const F1_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

export function leagueScorers(nPlayers: number): number {
  return Math.ceil(nPlayers / 2)
}

export function assignLeaguePoints(
  results: { profileId: string; score: number; handicap: number }[],
  nPlayers: number
): { profileId: string; points: number }[] {
  const scorers = leagueScorers(nPlayers)
  // Sort: lowest score wins (stroke play), tiebreak by handicap (lower = better)
  const sorted = [...results].sort((a, b) =>
    a.score !== b.score ? a.score - b.score : a.handicap - b.handicap
  )
  return sorted.map((r, i) => ({
    profileId: r.profileId,
    points: i < scorers ? (F1_POINTS[i] ?? 0) : 0,
  }))
}

// ─── Formatting ──────────────────────────────────────────────
export function formatHandicap(index: number | null): string {
  if (index == null) return '–'
  if (index < 0) return `+${Math.abs(index).toFixed(1)}`
  return index.toFixed(1)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Player avatar colors (cycle)
export const AVATAR_COLORS = [
  '#2a6fdb', '#1f8a5b', '#d4a24a', '#c6432d',
  '#7a3fc4', '#0f9c7a', '#e84a7a', '#3aa0c4',
]

export function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}
