import { useEffect, useRef, useState } from 'react'

/** Odometer-style roll when `value` changes: the old value slides up and out
 *  while the new one rises in from below. Static on first render. */
export function Ticker({ value, className = '' }: { value: number | string; className?: string }) {
  const [prev, setPrev] = useState<number | string | null>(null)
  const lastRef = useRef(value)
  useEffect(() => {
    if (lastRef.current === value) return
    setPrev(lastRef.current)
    lastRef.current = value
    const t = setTimeout(() => setPrev(null), 300)
    return () => clearTimeout(t)
  }, [value])
  return (
    <span className={`ticker ${className}`}>
      <span key={String(value)} className={prev != null ? 'ticker-in' : ''}>
        {value}
      </span>
      {prev != null && (
        <span aria-hidden className="ticker-out">
          {prev}
        </span>
      )}
    </span>
  )
}
