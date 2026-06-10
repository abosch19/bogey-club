import { ReactNode } from 'react'
import { useNavigate } from 'react-router'

/** Makes an avatar/name navigate to the player's page. Renders a plain span
 *  with link semantics so it can sit inside other <Link>s (feed rows, round
 *  cards) without nesting anchors; falls through untouched for guests. */
export function PlayerLink({ profileId, className = '', children }: {
  profileId: string | null | undefined
  className?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  if (!profileId) return <>{children}</>
  const go = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/player/${profileId}`)
  }
  return (
    <span role="link" tabIndex={0} className={`cursor-pointer ${className}`}
      onClick={go}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') go(e) }}>
      {children}
    </span>
  )
}
