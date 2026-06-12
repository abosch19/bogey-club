import { useEffect, useState } from 'react'

/** True once the page is scrolled — drives the iOS-style large-title →
 *  compact-header collapse in sticky page headers. Collapse and expand use
 *  different thresholds (hysteresis): collapsing shrinks the header, which
 *  itself reduces scrollY, so a single threshold would oscillate near it. */
export function useCollapsedHeader(collapseAt = 48, expandAt = 8): boolean {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const onScroll = () => setCollapsed(c => (c ? window.scrollY > expandAt : window.scrollY > collapseAt))
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [collapseAt, expandAt])
  return collapsed
}
