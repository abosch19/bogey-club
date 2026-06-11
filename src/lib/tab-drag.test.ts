import { describe, expect, it } from 'bun:test'
import { dragIndexForClientX, shouldTreatAsTabDrag } from './tab-drag'

describe('dragIndexForClientX', () => {
  it('maps a finger x position to the nearest tab index', () => {
    const layout = { left: 100, width: 248, tabCount: 4 }

    expect(dragIndexForClientX(layout, 101)).toBe(0)
    expect(dragIndexForClientX(layout, 162)).toBe(1)
    expect(dragIndexForClientX(layout, 224)).toBe(2)
    expect(dragIndexForClientX(layout, 347)).toBe(3)
  })

  it('clamps positions outside the tab bar', () => {
    const layout = { left: 100, width: 248, tabCount: 4 }

    expect(dragIndexForClientX(layout, 10)).toBe(0)
    expect(dragIndexForClientX(layout, 500)).toBe(3)
  })
})

describe('shouldTreatAsTabDrag', () => {
  it('requires enough horizontal movement before hijacking link taps', () => {
    expect(shouldTreatAsTabDrag(0, 7)).toBe(false)
    expect(shouldTreatAsTabDrag(0, 8)).toBe(true)
    expect(shouldTreatAsTabDrag(20, 11)).toBe(true)
  })
})
