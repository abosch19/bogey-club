import { Link, useLocation } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Avatar } from '@/components/ui/avatar'

export function TabBar() {
  const { pathname } = useLocation()
  const profile = useQuery(api.profiles.me)
  const fullName = profile ? [profile.name, profile.last_name].filter(Boolean).join(' ') : '?'

  const active = pathname === '/' ? 'inicio' : pathname.startsWith('/stats') ? 'stats' : pathname.startsWith('/league') ? 'liga' : pathname.startsWith('/profile') ? 'perfil' : ''

  const tabs = [
    { key: 'inicio', href: '/', label: 'Inicio',
      icon: (a: boolean) => a
        ? <svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9z" fill="currentColor"/></svg>
        : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth={1.8}/></svg> },
    { key: 'stats', href: '/stats', label: 'Stats',
      icon: (a: boolean) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 19V9m6 10V5m6 14v-7" stroke="currentColor" strokeWidth={a ? 2.6 : 1.8} strokeLinecap="round"/></svg> },
    { key: 'liga', href: '/league', label: 'Liga',
      icon: (a: boolean) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8} strokeLinecap="round"/><path d="M5 7H2v3a3 3 0 0 0 3 3M19 7h3v3a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8} strokeLinecap="round"/></svg> },
  ]

  return (
    <nav className="vt-tab-bar tabbar-float fixed left-1/2 -translate-x-1/2 z-50 bg-white/85 backdrop-blur-xl rounded-full shadow-[0_10px_34px_rgba(14,26,22,0.22),0_2px_8px_rgba(14,26,22,0.08)] px-2 py-1.5">
      <div className="flex items-center">
        {tabs.map(({ key, href, label, icon }) => {
          const isActive = key === active
          return (
            <Link key={key} to={href} aria-label={label}
              className={`w-[62px] h-[46px] flex items-center justify-center rounded-full transition-colors ${isActive ? 'bg-[#ececec] text-[#0e1a16]' : 'text-[#44524b]'}`}>
              {icon(isActive)}
            </Link>
          )
        })}
        <Link to="/profile" aria-label="Perfil"
          className="w-[62px] h-[46px] flex items-center justify-center rounded-full">
          <Avatar name={fullName} src={profile?.avatar_url} size={30}
            className={active === 'perfil' ? 'ring-2 ring-[#0e1a16] ring-offset-2 ring-offset-white' : ''} />
        </Link>
      </div>
    </nav>
  )
}
