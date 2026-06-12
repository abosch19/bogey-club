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

/** A course's kind, stored explicitly in `courses.type`. Courses that predate
 *  the field fall back to the legacy "P&P" name prefix. */
export type CourseKind = 'golf' | 'pp'
export function courseKind(course: { type?: CourseKind | null; name: string }): CourseKind {
  return course.type ?? (course.name.startsWith('P&P') ? 'pp' : 'golf')
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
  if (total >= 9) return 3
  if (total >= 6) return 2
  if (total >= 4) return 1
  return 0
}

export function calcHandicapIndex(differentials: number[]): number | null {
  const n = differentials.length
  const count = countingRounds(n)
  if (count === 0) return null
  const best = differentials.toSorted((a, b) => a - b).slice(0, count)
  const avg = best.reduce((a, b) => a + b, 0) / count
  return parseFloat(avg.toFixed(1))
}

// ─── Formatting ──────────────────────────────────────────────
export function formatHandicap(index: number | null): string {
  if (index == null) return '–'
  if (index < 0) return `+${Math.abs(index).toFixed(1)}`
  return index.toFixed(1)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
