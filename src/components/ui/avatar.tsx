// Deterministic avatar: two initials on a circle whose color derives from them.

const PALETTE = [
  '#1f8a5b', // green
  '#2a6fdb', // blue
  '#7a3fc4', // purple
  '#c6432d', // red
  '#9b6e1a', // ochre
  '#0e7a8a', // teal
  '#b8478a', // magenta
  '#5a6b2f', // olive
]

/** First letter of the first name + first letter of the last name (single letter if no last name). */
export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const ini = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0]
  return ini.toUpperCase()
}

/** Stable color for a name — hashed from its initials. */
export function avatarColor(name: string): string {
  const ini = avatarInitials(name)
  const code = ini.charCodeAt(0) * 31 + (ini.charCodeAt(1) || 7)
  return PALETTE[code % PALETTE.length]
}

type AvatarProps = {
  name: string
  /** Photo URL — when set it replaces the initials. */
  src?: string | null
  /** Diameter in px (default 32). Font size scales with it. */
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function Avatar({ name, src, size = 32, className = '', style }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size, ...style }}
      />
    )
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.36)),
        backgroundColor: avatarColor(name),
        ...style,
      }}
    >
      {avatarInitials(name)}
    </div>
  )
}
