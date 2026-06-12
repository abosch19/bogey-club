// Loading placeholders: pulsing blocks that sketch the page before data lands,
// so the layout doesn't jump from a centered spinner to the real content.

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton-shimmer ${className}`} />
}

/** Generic tab-page skeleton: title strip, hero surface and a few card rows. */
export function PageSkeleton({ hero = true, rows = 3 }: { hero?: boolean; rows?: number }) {
  return (
    <div
      className="min-h-screen bg-paper pb-28 px-[14px]"
      style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}
    >
      <Skeleton className="h-8 w-36 rounded-field mb-4" />
      {hero && <Skeleton className="h-44 rounded-card mb-4" />}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-card mb-3" />
      ))}
    </div>
  )
}
