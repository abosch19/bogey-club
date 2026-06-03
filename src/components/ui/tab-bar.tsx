'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, BarChart2, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/',        label: 'Inicio',   Icon: Home },
  { href: '/tarjeta', label: 'Tarjeta',  Icon: ClipboardList },
  { href: '/stats',   label: 'Stats',    Icon: BarChart2 },
  { href: '/liga',    label: 'Liga',     Icon: Trophy },
  { href: '/carnet',  label: 'Carnet',   Icon: User },
]

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e5e0d4] z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors',
                active ? 'text-[#1f8a5b]' : 'text-[#6b7a72]'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className={cn('text-[10px] font-semibold', active ? 'text-[#1f8a5b]' : 'text-[#6b7a72]')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
