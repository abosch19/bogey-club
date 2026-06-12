// Segmented pill tabs: a single dark indicator slides to the active option
// (0.3s iOS-style ease) while the labels cross-fade their color.

import { useRef, useState, type PointerEvent } from 'react'
import { dragIndexForClientX, shouldTreatAsTabDrag } from '@/lib/tab-drag'

type SegmentedProps<K extends string> = {
  options: readonly { readonly key: K; readonly label: string }[]
  value: K
  onChange: (key: K) => void
  className?: string
  /** Indicator color (default: ink). */
  color?: string
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  className = '',
  color = 'var(--c-ink)',
}: SegmentedProps<K>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const suppressNextClickRef = useRef(false)
  const [drag, setDrag] = useState<{
    pointerId: number
    startX: number
    targetIndex: number
    dragging: boolean
  } | null>(null)
  const activeIdx = Math.max(
    0,
    options.findIndex(o => o.key === value),
  )
  const n = options.length
  const indicatorIdx = drag?.dragging ? drag.targetIndex : activeIdx

  function indexForPointer(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return activeIdx
    return dragIndexForClientX({ left: rect.left, width: rect.width, tabCount: n }, clientX)
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      pointerId: event.pointerId,
      startX: event.clientX,
      targetIndex: indexForPointer(event.clientX),
      dragging: false,
    })
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    setDrag(current => {
      if (!current || current.pointerId !== event.pointerId) return current

      return {
        ...current,
        targetIndex: indexForPointer(event.clientX),
        dragging: current.dragging || shouldTreatAsTabDrag(current.startX, event.clientX),
      }
    })
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const current = drag
    setDrag(null)
    if (!current || current.pointerId !== event.pointerId) return

    const targetIndex = current.dragging ? current.targetIndex : indexForPointer(event.clientX)
    const option = options[targetIndex]
    suppressNextClickRef.current = true
    if (option && option.key !== value) onChange(option.key)
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex gap-1 bg-white rounded-full p-1 border border-rule touch-none select-none ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0.28,1)]"
        style={{
          backgroundColor: color,
          // p-1 (4px each side) + gap-1 (4px) between the n buttons
          width: `calc((100% - ${8 + (n - 1) * 4}px) / ${n})`,
          transform: `translateX(calc(${indicatorIdx * 100}% + ${indicatorIdx * 4}px))`,
        }}
      />
      {options.map((o, index) => (
        <button
          type="button"
          key={o.key}
          onClick={event => {
            if (!suppressNextClickRef.current) {
              onChange(o.key)
              return
            }
            suppressNextClickRef.current = false
            event.preventDefault()
          }}
          className="relative flex-1 py-1.5 rounded-full text-[11px] font-bold transition-colors duration-300"
          style={{ color: index === indicatorIdx ? '#fff' : 'var(--c-mute)' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
