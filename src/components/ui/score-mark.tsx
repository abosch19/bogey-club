// Classic scorecard notation: circle = birdie, double circle = eagle or
// better, square = bogey, double square = double bogey or worse, plain
// number = par. Monochrome, like a pencil-marked paper card.

const INK = 'var(--c-ink)'
const STROKE = 1.5

export function ScoreMark({ strokes, delta, size = 22 }: { strokes: number; delta: number; size?: number }) {
  // Inside a box the digit needs a tiny downward nudge: digits sit on the
  // baseline with empty descent below, so the ink otherwise rides high.
  const number = (nudge: boolean) => (
    <span
      className="font-mono font-bold leading-none"
      style={{
        color: INK,
        fontSize: Math.round(size * 0.5),
        transform: nudge ? 'translateY(0.05em)' : undefined,
      }}
    >
      {strokes}
    </span>
  )

  // Par: plain number, like on a paper card.
  if (delta === 0) {
    return (
      <div className="flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
        {number(false)}
      </div>
    )
  }

  const isCircle = delta < 0
  const double = Math.abs(delta) >= 2
  const shape = (inset: number, radius: number) => {
    const props = { fill: 'none', stroke: INK, strokeWidth: STROKE }
    return isCircle ? (
      <circle cx={size / 2} cy={size / 2} r={(size - inset * 2 - STROKE) / 2} {...props} />
    ) : (
      <rect
        x={inset + STROKE / 2}
        y={inset + STROKE / 2}
        width={size - inset * 2 - STROKE}
        height={size - inset * 2 - STROKE}
        rx={radius}
        {...props}
      />
    )
  }
  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden>
        {shape(0, 4)}
        {double && shape(3, 2)}
      </svg>
      {number(true)}
    </div>
  )
}
