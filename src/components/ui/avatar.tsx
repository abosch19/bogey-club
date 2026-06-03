import { cn } from '@/lib/utils'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AvatarProps {
  name: string
  color: string
  size?: AvatarSize
  you?: boolean
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-[13px]',
  lg: 'w-14 h-14 text-[20px]',
}

export function Avatar({ name, color, size = 'md', you = false, className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-bold text-white flex-shrink-0',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
      {you && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#1f8a5b] border-2 border-white" />
      )}
    </div>
  )
}
