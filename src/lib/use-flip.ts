import { useLayoutEffect, useRef } from 'react'

/** FLIP reorder: register row elements by key with the returned ref factory
 *  and, whenever a row's vertical position changes between renders, it glides
 *  from the old position to the new one (WAAPI, ~350ms). */
export function useFlip() {
  const nodes = useRef(new Map<string, HTMLElement>())
  const prevTops = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    for (const [key, el] of nodes.current) {
      const prevTop = prevTops.current.get(key)
      const top = el.getBoundingClientRect().top
      if (prevTop != null && Math.abs(prevTop - top) > 1) {
        el.animate([{ transform: `translateY(${prevTop - top}px)` }, { transform: 'translateY(0)' }], {
          duration: 350,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        })
      }
      prevTops.current.set(key, top)
    }
  })

  return (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el)
    else nodes.current.delete(key)
  }
}
