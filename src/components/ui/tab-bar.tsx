import { Link, useLocation } from 'react-router-dom'

export function TabBar() {
  const { pathname } = useLocation()

  const active = pathname === '/' ? 'inicio' : pathname.startsWith('/stats') ? 'stats' : pathname.startsWith('/league') ? 'liga' : pathname.startsWith('/profile') ? 'perfil' : ''

  const tabs = [
    { key: 'inicio', href: '/', label: 'Inicio',
      icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth={a?2.2:1.7}/></svg> },
    { key: 'stats', href: '/stats', label: 'Stats',
      icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19V9m6 10V5m6 14v-7" stroke="currentColor" strokeWidth={a?2.2:1.7} strokeLinecap="round"/></svg> },
    { key: 'liga', href: '/league', label: 'Liga',
      icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z" stroke="currentColor" strokeWidth={a?2.2:1.7} strokeLinecap="round"/><path d="M5 7H2v3a3 3 0 0 0 3 3M19 7h3v3a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth={a?2.2:1.7} strokeLinecap="round"/></svg> },
    { key: 'perfil', href: '/profile', label: 'Perfil',
      icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={a?2.2:1.7}/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth={a?2.2:1.7} strokeLinecap="round"/></svg> },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e5e0d4] z-50">
      <div className="flex items-stretch">
        {tabs.map(({ key, href, label, icon }) => {
          const isActive = key === active
          return (
            <Link key={key} to={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors ${isActive ? 'text-[#1f8a5b]' : 'text-[#6b7a72]'}`}>
              {icon(isActive)}
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
