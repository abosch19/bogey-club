import { scoreChipColors } from '@/lib/golf'
import { cn } from '@/lib/utils'

interface ScoreChipProps {
  score: number
  par: number
  className?: string
}

export function ScoreChip({ score, par, className }: ScoreChipProps) {
  const delta = score - par
  const { bg, text } = scoreChipColors(delta)

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-[13px] leading-none',
        className
      )}
      style={{ backgroundColor: bg, color: text }}
    >
      {score}
    </span>
  )
}
