import { ReactNode, type CSSProperties } from 'react'

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
  style?: CSSProperties
}

/** Dark brand card: depth gradient, radial orb, credit-card pinstripes and a
 *  diagonal sheen. Shared look for every hero surface (home, stats, carnet…). */
export function HeroCard({
  children,
  className = '',
  orbColor = 'var(--c-accent)',
  orbSize = 190,
  decor,
  style,
}: HeroCardProps) {
  const offset = -Math.round(orbSize * 0.26)
  return (
    <div className={`hero-card rounded-card relative overflow-hidden shadow-hero ${className}`} style={style}>
      <div
        className="absolute rounded-full"
        style={{
          right: offset,
          top: offset,
          width: orbSize,
          height: orbSize,
          background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${orbColor} 72%, white) 0%, ${orbColor} 55%, transparent 72%)`,
        }}
      />
      <div className="hero-pinstripes absolute inset-0 opacity-[0.04]" />
      <div className="hero-shine absolute inset-0" />
      {decor}
      <div className="relative">{children}</div>
    </div>
  )
}
