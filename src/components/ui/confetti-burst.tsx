// Brief transparent confetti burst (e.g. an eagle mid-round) — unlike the
// signing Celebration it doesn't take over the screen. Remount (key) to replay.

// Deterministic pseudo-random per piece (Math.random is off-limits with the compiler).
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const COLORS = ['#1f8a5b', '#e8b75a', '#2a6fdb', '#c6432d', '#9bc9a3', '#ffffff']

export function ConfettiBurst({ pieces = 24 }: { pieces?: number }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {Array.from({ length: pieces }, (_, i) => (
        <div
          key={i}
          className="absolute top-0 rounded-[2px]"
          style={{
            left: `${rnd(i, 1) * 100}%`,
            width: 5 + rnd(i, 2) * 5,
            height: 9 + rnd(i, 3) * 7,
            backgroundColor: COLORS[i % COLORS.length],
            animation: `confetti-fall ${1.4 + rnd(i, 4) * 0.9}s ${rnd(i, 5) * 0.3}s cubic-bezier(0.25, 0.6, 0.45, 1) both`,
          }}
        />
      ))}
    </div>
  )
}
