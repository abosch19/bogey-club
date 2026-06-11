// Segmented pill tabs: a single dark indicator slides to the active option
// (0.3s iOS-style ease) while the labels cross-fade their color.

type SegmentedProps<K extends string> = {
  options: readonly { readonly key: K; readonly label: string }[]
  value: K
  onChange: (key: K) => void
  className?: string
  /** Indicator color (default: ink). */
  color?: string
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  className = '',
  color = '#0e1a16',
}: SegmentedProps<K>) {
  const activeIdx = Math.max(
    0,
    options.findIndex(o => o.key === value),
  )
  const n = options.length
  return (
    <div className={`relative flex gap-1 bg-white rounded-full p-1 border border-[#e5e0d4] ${className}`}>
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0.28,1)]"
        style={{
          backgroundColor: color,
          // p-1 (4px each side) + gap-1 (4px) between the n buttons
          width: `calc((100% - ${8 + (n - 1) * 4}px) / ${n})`,
          transform: `translateX(calc(${activeIdx * 100}% + ${activeIdx * 4}px))`,
        }}
      />
      {options.map(o => (
        <button
          type="button"
          key={o.key}
          onClick={() => onChange(o.key)}
          className="relative flex-1 py-1.5 rounded-full text-[11px] font-bold transition-colors duration-300"
          style={{ color: o.key === value ? '#fff' : '#6b7a72' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
