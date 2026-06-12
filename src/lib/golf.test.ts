import { describe, it, expect } from 'bun:test'
import {
  strokesReceived,
  courseHandicap,
  courseKind,
  stablefordPts,
  scoreDifferential,
  countingRounds,
  calcHandicapIndex,
  formatHandicap,
  formatDate,
} from './golf'

describe('strokesReceived', () => {
  it('gives one stroke on every hole with course handicap 18', () => {
    for (let si = 1; si <= 18; si++) expect(strokesReceived(18, si)).toBe(1)
  })

  it('gives strokes only on the hardest holes with course handicap 9', () => {
    expect(strokesReceived(9, 1)).toBe(1)
    expect(strokesReceived(9, 9)).toBe(1)
    expect(strokesReceived(9, 10)).toBe(0)
    expect(strokesReceived(9, 18)).toBe(0)
  })

  it('gives a second stroke on the hardest holes above handicap 18', () => {
    // hcp 24 → 2 strokes on SI 1-6, 1 stroke on SI 7-18
    expect(strokesReceived(24, 1)).toBe(2)
    expect(strokesReceived(24, 6)).toBe(2)
    expect(strokesReceived(24, 7)).toBe(1)
    expect(strokesReceived(24, 18)).toBe(1)
  })

  it('gives two strokes everywhere with course handicap 36', () => {
    expect(strokesReceived(36, 1)).toBe(2)
    expect(strokesReceived(36, 18)).toBe(2)
  })

  it('gives no strokes to scratch and plus handicaps', () => {
    expect(strokesReceived(0, 1)).toBe(0)
    expect(strokesReceived(-2, 1)).toBe(0)
  })
})

describe('courseHandicap', () => {
  it('applies the WHS formula: index × (slope/113) + (CR − par)', () => {
    // 18.0 × (130/113) + (72.5 − 72) = 20.71 + 0.5 = 21.21 → 21
    expect(courseHandicap(18.0, 130, 72.5, 72)).toBe(21)
  })

  it('is the index plus CR−par on a neutral slope (113)', () => {
    expect(courseHandicap(10.0, 113, 70.0, 72)).toBe(8)
  })

  it('rounds to the nearest whole stroke', () => {
    // 11.4 × (120/113) = 12.106 → 12 ; 11.8 × (120/113) = 12.53 → 13
    expect(courseHandicap(11.4, 120, 72.0, 72)).toBe(12)
    expect(courseHandicap(11.8, 120, 72.0, 72)).toBe(13)
  })

  it('keeps plus handicaps negative', () => {
    expect(courseHandicap(-2.0, 113, 72.0, 72)).toBe(-2)
  })

  it('is 0 for a scratch player on a neutral course', () => {
    expect(courseHandicap(0, 113, 72.0, 72)).toBe(0)
  })
})

describe('courseKind', () => {
  it('prefers the explicit type over the name', () => {
    expect(courseKind({ type: 'pp', name: 'Campo sin prefijo' })).toBe('pp')
    expect(courseKind({ type: 'golf', name: 'P&P Can Cuyas' })).toBe('golf')
  })

  it('falls back to the P&P name prefix for legacy docs', () => {
    expect(courseKind({ name: 'P&P Can Cuyas' })).toBe('pp')
    expect(courseKind({ name: 'Golf Barcelona - Masía' })).toBe('golf')
    expect(courseKind({ type: null, name: 'P&P Can Cuyas' })).toBe('pp')
  })

  it('only matches the prefix, not the middle of the name', () => {
    expect(courseKind({ name: 'Club P&P Costa' })).toBe('golf')
  })
})

describe('stablefordPts', () => {
  it('scores gross results against par without strokes received', () => {
    expect(stablefordPts(2, 4, 0)).toBe(4) // eagle
    expect(stablefordPts(3, 4, 0)).toBe(3) // birdie
    expect(stablefordPts(4, 4, 0)).toBe(2) // par
    expect(stablefordPts(5, 4, 0)).toBe(1) // bogey
    expect(stablefordPts(6, 4, 0)).toBe(0) // double bogey
  })

  it('never goes below zero', () => {
    expect(stablefordPts(9, 4, 0)).toBe(0)
  })

  it('applies strokes received to the net score', () => {
    // gross bogey with one stroke received = net par = 2 pts
    expect(stablefordPts(5, 4, 1)).toBe(2)
    // gross double with two strokes received = net par = 2 pts
    expect(stablefordPts(6, 4, 2)).toBe(2)
  })
})

describe('scoreDifferential', () => {
  it('is the score over course rating on a neutral slope (113)', () => {
    expect(scoreDifferential(85, 70.3, 113)).toBe(14.7)
  })

  it('scales by 113/slope on harder courses', () => {
    // (113/130) × (90 − 72.5) = 15.2115… → 15.21
    expect(scoreDifferential(90, 72.5, 130)).toBe(15.21)
  })

  it('is negative when beating the course rating', () => {
    expect(scoreDifferential(68, 70.0, 113)).toBe(-2)
  })

  it('rounds to two decimals', () => {
    // (113/120) × (88 − 71.2) = 15.818 → 15.82
    expect(scoreDifferential(88, 71.2, 120)).toBe(15.82)
  })
})

describe('countingRounds', () => {
  it('follows the WHS best-N table', () => {
    const expected: [total: number, counting: number][] = [
      [0, 0],
      [3, 0],
      [4, 1],
      [5, 1],
      [6, 2],
      [8, 2],
      [9, 3],
      [11, 3],
      [12, 4],
      [14, 4],
      [15, 5],
      [16, 5],
      [17, 6],
      [18, 6],
      [19, 7],
      [20, 8],
      [25, 8],
    ]
    for (const [total, counting] of expected) expect(countingRounds(total)).toBe(counting)
  })
})

describe('calcHandicapIndex', () => {
  it('is null with fewer than 4 differentials', () => {
    expect(calcHandicapIndex([])).toBeNull()
    expect(calcHandicapIndex([10.1, 12.3, 9.8])).toBeNull()
  })

  it('uses only the single best differential with 4 rounds', () => {
    expect(calcHandicapIndex([10.1, 12.3, 15.0, 9.8])).toBe(9.8)
  })

  it('averages the best 8 of 20 differentials', () => {
    const best8 = [8.1, 8.3, 8.5, 8.7, 8.9, 9.1, 9.3, 9.5] // avg 8.8
    const worst12 = Array.from({ length: 12 }, () => 20.0)
    expect(calcHandicapIndex([...worst12, ...best8])).toBe(8.8)
  })

  it('rounds to one decimal', () => {
    // best 2 of 6: (10.11 + 10.32) / 2 = 10.215 → 10.2
    expect(calcHandicapIndex([10.11, 10.32, 15.0, 15.0, 15.0, 15.0])).toBe(10.2)
  })

  it('supports plus-handicap (negative) results', () => {
    expect(calcHandicapIndex([-1.3, 2.0, 3.0, 4.0])).toBe(-1.3)
  })
})

describe('formatHandicap', () => {
  it('shows a dash for missing index', () => {
    expect(formatHandicap(null)).toBe('–')
  })

  it('shows one decimal', () => {
    expect(formatHandicap(10.2)).toBe('10.2')
    expect(formatHandicap(0)).toBe('0.0')
  })

  it('shows plus handicaps with a + sign', () => {
    expect(formatHandicap(-1.2)).toBe('+1.2')
  })
})

describe('formatDate', () => {
  it('formats ISO dates in Spanish', () => {
    const out = formatDate('2026-06-11')
    expect(out).toContain('2026')
    expect(out.toLowerCase()).toContain('jun')
    expect(out).toContain('11')
  })
})
