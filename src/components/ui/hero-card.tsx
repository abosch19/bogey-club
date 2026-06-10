import { ReactNode } from 'react'

type HeroCardProps = {
  children: ReactNode
  /** Layout classes for the card box (padding, margins…). */
  className?: string
  /** Orb tint — defaults to brand green; e.g. amber for tournaments, red for admin. */
  orbColor?: string
  /** Orb diameter in px. */
  orbSize?: number
  /** Extra absolutely-positioned art rendered above the texture (flags, balls…). */
  decor?: ReactNode
}

/** Dark brand card: depth gradient, radial orb, credit-card pinstripes and a
 *  diagonal sheen. Shared look for every hero surface (home, stats, carnet…). */
export function HeroCard({ children, className = '', orbColor = '#1f8a5b', orbSize = 190, decor }: HeroCardProps) {
  const offset = -Math.round(orbSize * 0.26)
  return (
    <div className={`rounded-[22px] relative overflow-hidden shadow-[0_14px_34px_rgba(14,26,22,0.28)] ${className}`}
      style={{ background: 'linear-gradient(140deg, #0a1511 0%, #0e1a16 46%, #17291f 100%)' }}>
      <div className="absolute rounded-full" style={{
        right: offset, top: offset, width: orbSize, height: orbSize,
        background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${orbColor} 72%, white) 0%, ${orbColor} 55%, transparent 72%)`,
      }}/>
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 9px)' }}/>
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.07) 46%, transparent 58%)' }}/>
      {decor}
      <div className="relative">{children}</div>
    </div>
  )
}
