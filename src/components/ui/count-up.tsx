import { useEffect, useState } from 'react'

/** Eases a number from 0 to its value on mount (cubic ease-out, 800ms). */
export function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const started = performance.now()
    let raf = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - started) / 800)
      setProgress(1 - Math.pow(1 - p, 3))
      if (p < 1) raf = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(raf)
  }, [])
  return <>{format(value * progress)}</>
}
