import { ReactNode, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Navigate, Route, Routes, useLocation, useNavigationType, useSearchParams } from 'react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { TabBar } from '@/components/ui/tab-bar'
import { OfflineSync } from '@/components/OfflineSync'

import HomePage from '@/app/page'
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'
import OnboardingPage from '@/app/onboarding/page'
import ProfilePage from '@/app/profile/page'
import StatsPage from '@/app/stats/page'
import PlayersPage from '@/app/players/page'
import PlayerPage from '@/app/player/[id]/page'
import ScorecardPage from '@/app/scorecard/page'
import CoursePage from '@/app/course/[id]/page'
import AdminPage from '@/app/admin/page'
import AdminCoursePage from '@/app/admin/course/[id]/page'
import LeaguePage from '@/app/league/page'
import LeagueNewPage from '@/app/league/new/page'
import TournamentPage from '@/app/tournament/[id]/page'
import TournamentNewPage from '@/app/tournament/new/page'
import RoundCoursePage from '@/app/round/course/page'
import RoundPlayersPage from '@/app/round/players/page'
import RoundFormatPage from '@/app/round/format/page'
import RoundPairsPage from '@/app/round/pairs/page'

/** Legacy route — the summary screen merged into /scorecard. */
function SummaryRedirect() {
  const [searchParams] = useSearchParams()
  const round = searchParams.get('round')
  return <Navigate to={round ? `/scorecard?round=${round}` : '/'} replace />
}

const PUBLIC_ROUTES = ['/login', '/register', '/onboarding']
/** Routes that show the persistent bottom tab bar. */
const TAB_ROUTES = ['/', '/league', '/stats', '/profile']

/** Mirrors the #splash markup in index.html so the bundle→auth handoff is seamless. */
function Splash() {
  return (
    <div className="fixed inset-0 bg-[#f4f1e9] flex flex-col items-center justify-center">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#9bc9a3" />
        <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16" />
        <circle cx="24" cy="50" r="2.6" fill="#0e1a16" />
      </svg>
      <div className="mt-3 text-[22px] leading-none font-black tracking-tight text-[#0e1a16]">
        Bogey <span className="text-[#1f8a5b]">Club</span>
      </div>
    </div>
  )
}

const SPLASH_MIN_MS = 500

/** Keeps the splash up until 500ms after page load so the logo doesn't flash. */
function useSplashHold() {
  const [hold, setHold] = useState(() => performance.now() < SPLASH_MIN_MS)
  useEffect(() => {
    if (!hold) return
    const t = setTimeout(() => setHold(false), Math.max(0, SPLASH_MIN_MS - performance.now()))
    return () => clearTimeout(t)
  }, [hold])
  return hold
}

/** Client-side replacement for the old Next.js auth middleware. */
function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const holding = useSplashHold()
  const { pathname } = useLocation()
  const isPublic = PUBLIC_ROUTES.includes(pathname)

  if (isLoading || holding) return <Splash />

  if (!isPublic && !isAuthenticated) return <Navigate to="/login" replace />
  if (isPublic && isAuthenticated && pathname !== '/onboarding') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/** True when the browser already animated the navigation itself (iOS edge-swipe
 *  back/forward) — running our own view transition on top replays the slide. */
let uaHandledTransition = false
window.addEventListener('popstate', e => {
  uaHandledTransition = (e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition ?? false
})

/** Scroll position per history entry, restored on pop instead of jumping to top. */
const scrollPositions = new Map<string, number>()
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

/** Drives route changes through the View Transitions API. The rendered
 *  location lags one frame behind the router's so the old screen can be
 *  snapshotted; `data-nav` on <html> picks the animation in globals.css:
 *  push (slide in from the right), pop (slide back out) or fade (tab switch).
 *  Falls back to an instant swap without the API, with reduced motion, or
 *  when the UA already animated the gesture (hasUAVisualTransition).
 *  Scroll resets inside the transition so tabs don't share scrollY; pops
 *  restore the scroll the screen had when it was left. */
function TransitionRoutes({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [displayLocation, setDisplayLocation] = useState(location)

  useEffect(() => {
    if (location.key === displayLocation.key) return

    scrollPositions.set(displayLocation.key, window.scrollY)
    const isPop = navigationType === 'POP'

    const commit = () => {
      flushSync(() => setDisplayLocation(location))
      const y = isPop ? (scrollPositions.get(location.key) ?? 0) : 0
      window.scrollTo(0, y)
      document.scrollingElement?.scrollTo(0, y)
    }

    const skipForUA = isPop && uaHandledTransition
    uaHandledTransition = false

    if (skipForUA || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit()
      return
    }

    const tabSwitch = TAB_ROUTES.includes(displayLocation.pathname) && TAB_ROUTES.includes(location.pathname)
    document.documentElement.dataset.nav = tabSwitch ? 'fade' : isPop ? 'pop' : 'push'
    document.startViewTransition(commit).finished.finally(() => {
      delete document.documentElement.dataset.nav
    })
  }, [location, displayLocation, navigationType])

  return (
    <>
      <Routes location={displayLocation}>{children}</Routes>
      {TAB_ROUTES.includes(displayLocation.pathname) && <TabBar />}
    </>
  )
}

/** Subscribes to every tab's queries so they stay cached — switching tabs
 *  then renders from cache instantly instead of flashing a loading spinner. */
function WarmQueries() {
  useQuery(api.home.dashboard)
  useQuery(api.home.recentRounds)
  useQuery(api.stats.forUser)
  useQuery(api.leagues.listForUser)
  useQuery(api.profiles.me)
  useQuery(api.profiles.myDifferentials)
  return null
}

function KeepWarm() {
  const { isAuthenticated } = useConvexAuth()
  return isAuthenticated ? <WarmQueries /> : null
}

export function App() {
  return (
    <div className="mx-auto max-w-[430px] min-h-screen relative">
      <KeepWarm />
      <OfflineSync />
      <AuthGuard>
        <TransitionRoutes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/player/:id" element={<PlayerPage />} />
          <Route path="/summary" element={<SummaryRedirect />} />
          <Route path="/scorecard" element={<ScorecardPage />} />
          <Route path="/course/:id" element={<CoursePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/course/:id" element={<AdminCoursePage />} />
          <Route path="/league" element={<LeaguePage />} />
          <Route path="/league/new" element={<LeagueNewPage />} />
          <Route path="/tournament/:id" element={<TournamentPage />} />
          <Route path="/tournament/new" element={<TournamentNewPage />} />
          <Route path="/round/course" element={<RoundCoursePage />} />
          <Route path="/round/players" element={<RoundPlayersPage />} />
          <Route path="/round/format" element={<RoundFormatPage />} />
          <Route path="/round/pairs" element={<RoundPairsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </TransitionRoutes>
      </AuthGuard>
    </div>
  )
}
