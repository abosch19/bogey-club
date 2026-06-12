import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Avatar } from '@/components/ui/avatar'
import { dragIndexForClientX, shouldTreatAsTabDrag } from '@/lib/tab-drag'

const TAB_WIDTH = 62

type DragState = {
  pointerId: number
  startX: number
  currentX: number
  targetIndex: number
  dragging: boolean
}

export function TabBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const profile = useQuery(api.profiles.me)
  const containerRef = useRef<HTMLDivElement>(null)
  const suppressNextClickRef = useRef(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const fullName = profile ? [profile.name, profile.last_name].filter(Boolean).join(' ') : '?'

  const active =
    pathname === '/'
      ? 'inicio'
      : pathname.startsWith('/stats')
        ? 'stats'
        : pathname.startsWith('/league')
          ? 'liga'
          : pathname.startsWith('/profile')
            ? 'perfil'
            : ''

  const tabs = [
    {
      key: 'inicio',
      href: '/',
      label: 'Inicio',
      icon: (a: boolean) =>
        a ? (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9z"
              stroke="currentColor"
              strokeWidth={1.8}
            />
          </svg>
        ),
    },
    {
      key: 'stats',
      href: '/stats',
      label: 'Stats',
      icon: (a: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 19V9m6 10V5m6 14v-7" stroke="currentColor" strokeWidth={a ? 2.6 : 1.8} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: 'liga',
      href: '/league',
      label: 'Liga',
      icon: (a: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z"
            stroke="currentColor"
            strokeWidth={a ? 2.4 : 1.8}
            strokeLinecap="round"
          />
          <path
            d="M5 7H2v3a3 3 0 0 0 3 3M19 7h3v3a3 3 0 0 1-3 3"
            stroke="currentColor"
            strokeWidth={a ? 2.4 : 1.8}
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: 'perfil',
      href: '/profile',
      label: 'Perfil',
      icon: (a: boolean) => (
        <Avatar
          name={fullName}
          src={profile?.avatar_url}
          size={30}
          className={a ? 'ring-2 ring-ink ring-offset-2 ring-offset-[#ececec]' : ''}
        />
      ),
    },
  ]
  const activeIndex = Math.max(
    0,
    tabs.findIndex(tab => tab.key === active),
  )
  const indicatorIndex = drag?.dragging ? drag.targetIndex : activeIndex

  function indexForPointer(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return activeIndex
    return dragIndexForClientX({ left: rect.left, width: rect.width, tabCount: tabs.length }, clientX)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const targetIndex = indexForPointer(event.clientX)
    setDrag({
      pointerId: event.pointerId,
      startX: event.clientX,
      currentX: event.clientX,
      targetIndex,
      dragging: false,
    })
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    setDrag(current => {
      if (!current || current.pointerId !== event.pointerId) return current

      const dragging = current.dragging || shouldTreatAsTabDrag(current.startX, event.clientX)
      return {
        ...current,
        currentX: event.clientX,
        targetIndex: indexForPointer(event.clientX),
        dragging,
      }
    })
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag
    setDrag(null)
    if (!current || current.pointerId !== event.pointerId) return

    const targetIndex = current.dragging ? current.targetIndex : indexForPointer(event.clientX)
    suppressNextClickRef.current = true
    const destination = tabs[targetIndex]
    if (destination && destination.key !== active) navigate(destination.href)
  }

  return (
    // Glass pill; globals.css drops the blur to solid white while html[data-nav]
    // is set, because view-transition snapshots render backdrop-filter as a square.
    <nav className="vt-tab-bar tabbar-float fixed left-1/2 -translate-x-1/2 z-50 bg-white/45 backdrop-blur-md backdrop-saturate-150 rounded-full shadow-float px-2 py-1.5">
      <div
        ref={containerRef}
        className="relative flex items-center touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          className="absolute left-0 top-0 h-[46px] w-[62px] rounded-full bg-[#ececec] transition-transform duration-150 ease-out"
          style={{ transform: `translateX(${indicatorIndex * TAB_WIDTH}px)` }}
        />
        {tabs.map(({ key, href, label, icon }) => {
          const isActive = key === active
          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              onClick={event => {
                if (!suppressNextClickRef.current) {
                  if (key !== active) navigate(href)
                  return
                }
                suppressNextClickRef.current = false
                event.preventDefault()
              }}
              className={`relative z-10 w-[62px] h-[46px] flex items-center justify-center rounded-full transition-colors ${isActive ? 'text-ink' : 'text-[#44524b]'}`}
            >
              {icon(isActive)}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
