import { cn } from '@/lib/utils'

type PillVariant = 'default' | 'accent' | 'blue' | 'amber' | 'red'
type PillSize = 'sm' | 'md'

interface PillProps {
  children: React.ReactNode
  variant?: PillVariant
  size?: PillSize
  className?: string
}

const variantStyles: Record<PillVariant, string> = {
  default: 'bg-[#e8e4d9] text-[#0e1a16]',
  accent:  'bg-[#d9eedd] text-[#1f8a5b]',
  blue:    'bg-[#dde7fb] text-[#2a6fdb]',
  amber:   'bg-[#fdf0d5] text-[#b8832a]',
  red:     'bg-[#fee2e2] text-[#dc2626]',
}

const sizeStyles: Record<PillSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-3 py-1 text-[13px]',
}

export function Pill({ children, variant = 'default', size = 'md', className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold leading-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}
