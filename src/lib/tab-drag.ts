export type TabDragLayout = {
  left: number
  width: number
  tabCount: number
}

const TAB_DRAG_THRESHOLD_PX = 8

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function dragIndexForClientX({ left, width, tabCount }: TabDragLayout, clientX: number) {
  const tabWidth = width / tabCount
  const rawIndex = Math.floor((clientX - left) / tabWidth)
  return clamp(rawIndex, 0, tabCount - 1)
}

export function shouldTreatAsTabDrag(startX: number, currentX: number) {
  return Math.abs(currentX - startX) >= TAB_DRAG_THRESHOLD_PX
}
