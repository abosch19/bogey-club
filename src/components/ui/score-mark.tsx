// Classic scorecard notation: circle = birdie, double circle = eagle or
// better, square = bogey, double square = double bogey or worse, plain
// number = par. Monochrome, like a pencil-marked paper card.

const INK = 'var(--c-ink)'

export function ScoreMark({ strokes, delta, size = 22 }: { strokes: number; delta: number; size?: number }) {
  const color = INK
  const number = (
    <span className="font-mono font-bold leading-none" style={{ color: INK, fontSize: Math.round(size * 0.5) }}>
      {strokes}
    </span>
  )

  // Par: plain number, like on a paper card.
  if (delta === 0) {
    return (
      <div className="flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
        {number}
      </div>
    )
  }

  const isCircle = delta < 0
  const double = Math.abs(delta) >= 2
  const outer: React.CSSProperties = {
    width: size,
    height: size,
    border: `1.5px solid ${color}`,
    borderRadius: isCircle ? 9999 : 4,
  }
  return (
    <div className="flex items-center justify-center mx-auto" style={outer}>
      {double ? (
        <div
          className="flex items-center justify-center"
          style={{
            width: size - 6,
            height: size - 6,
            border: `1.5px solid ${color}`,
            borderRadius: isCircle ? 9999 : 2,
          }}
        >
          {number}
        </div>
      ) : (
        number
      )}
    </div>
  )
}
