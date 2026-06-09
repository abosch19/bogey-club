import { ReactNode, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
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
import SummaryPage from '@/app/summary/page'
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

/** Reset scroll to the top on every route change so tabs don't share scrollY. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.scrollingElement?.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Renders the bottom bar only on tab routes; stays mounted so it never flickers. */
function PersistentTabBar() {
  const { pathname } = useLocation()
  if (!TAB_ROUTES.includes(pathname)) return null
  return <TabBar />
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
      <ScrollToTop />
      <KeepWarm />
      <AuthGuard>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/summary" element={<SummaryPage />} />
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
        </Routes>
        <PersistentTabBar />
      </AuthGuard>
    </div>
  )
}
