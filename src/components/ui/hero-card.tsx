import { cn } from '@/lib/utils'

interface HeroCardProps {
  children: React.ReactNode
  className?: string
}

export function HeroCard({ children, className }: HeroCardProps) {
  return (
    <div
      className={cn(
        'rounded-[22px] p-5 overflow-hidden',
        className
      )}
      style={{ backgroundColor: '#0e1a16' }}
    >
      {children}
    </div>
  )
}
