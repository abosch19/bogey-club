import { ReactNode, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Navigate, Route, Routes, useLocation, useNavigationType, useSearchParams } from 'react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { TabBar } from '@/components/ui/tab-bar'

import HomePage from '@/app/page'
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'
import OnboardingPage from '@/app/onboarding/page'
import ProfilePage from '@/app/profile/page'
import StatsPage from '@/app/stats/page'
import PlayersPage from '@/app/players/page'
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

function Spinner() {
  return (
    <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
    </div>
  )
}

/** Client-side replacement for the old Next.js auth middleware. */
function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { pathname } = useLocation()
  const isPublic = PUBLIC_ROUTES.includes(pathname)

  if (isLoading) return <Spinner />

  if (!isPublic && !isAuthenticated) return <Navigate to="/login" replace />
  if (isPublic && isAuthenticated && pathname !== '/onboarding') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/** Drives route changes through the View Transitions API. The rendered
 *  location lags one frame behind the router's so the old screen can be
 *  snapshotted; `data-nav` on <html> picks the animation in globals.css:
 *  push (slide in from the right), pop (slide back out) or fade (tab switch).
 *  Falls back to an instant swap without the API or with reduced motion.
 *  Scroll resets inside the transition so tabs don't share scrollY. */
function TransitionRoutes({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [displayLocation, setDisplayLocation] = useState(location)

  useEffect(() => {
    if (location.key === displayLocation.key) return

    const commit = () => {
      flushSync(() => setDisplayLocation(location))
      window.scrollTo(0, 0)
      document.scrollingElement?.scrollTo(0, 0)
    }

    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit()
      return
    }

    const tabSwitch =
      TAB_ROUTES.includes(displayLocation.pathname) && TAB_ROUTES.includes(location.pathname)
    document.documentElement.dataset.nav = tabSwitch ? 'fade' : navigationType === 'POP' ? 'pop' : 'push'
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
      <AuthGuard>
        <TransitionRoutes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/players" element={<PlayersPage />} />
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
