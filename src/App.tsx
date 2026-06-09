import { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useConvexAuth } from 'convex/react'
import { TabBar } from '@/components/ui/tab-bar'

import HomePage from '@/app/page'
import LoginPage from '@/app/login/page'
import RegistroPage from '@/app/registro/page'
import OnboardingPage from '@/app/onboarding/page'
import PerfilPage from '@/app/perfil/page'
import StatsPage from '@/app/stats/page'
import JugadoresPage from '@/app/jugadores/page'
import HoyoPage from '@/app/hoyo/page'
import ResumenPage from '@/app/resumen/page'
import TarjetaPage from '@/app/tarjeta/page'
import CampoPage from '@/app/campo/[id]/page'
import AdminPage from '@/app/admin/page'
import AdminCampoPage from '@/app/admin/campo/[id]/page'
import LigaPage from '@/app/liga/page'
import LigaNuevaPage from '@/app/liga/nueva/page'
import TorneoPage from '@/app/torneo/[id]/page'
import TorneoNuevoPage from '@/app/torneo/nuevo/page'
import RondaCampoPage from '@/app/ronda/campo/page'
import RondaJugadoresPage from '@/app/ronda/jugadores/page'
import RondaModalidadPage from '@/app/ronda/modalidad/page'
import RondaParejasPage from '@/app/ronda/parejas/page'

const PUBLIC_ROUTES = ['/login', '/registro', '/onboarding']
/** Routes that show the persistent bottom tab bar. */
const TAB_ROUTES = ['/', '/liga', '/stats', '/perfil']

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

/** Renders the bottom bar only on tab routes; stays mounted so it never flickers. */
function PersistentTabBar() {
  const { pathname } = useLocation()
  if (!TAB_ROUTES.includes(pathname)) return null
  return <TabBar />
}

export function App() {
  return (
    <div className="mx-auto max-w-[430px] min-h-screen relative">
      <AuthGuard>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/jugadores" element={<JugadoresPage />} />
          <Route path="/hoyo" element={<HoyoPage />} />
          <Route path="/resumen" element={<ResumenPage />} />
          <Route path="/tarjeta" element={<TarjetaPage />} />
          <Route path="/campo/:id" element={<CampoPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/campo/:id" element={<AdminCampoPage />} />
          <Route path="/liga" element={<LigaPage />} />
          <Route path="/liga/nueva" element={<LigaNuevaPage />} />
          <Route path="/torneo/:id" element={<TorneoPage />} />
          <Route path="/torneo/nuevo" element={<TorneoNuevoPage />} />
          <Route path="/ronda/campo" element={<RondaCampoPage />} />
          <Route path="/ronda/jugadores" element={<RondaJugadoresPage />} />
          <Route path="/ronda/modalidad" element={<RondaModalidadPage />} />
          <Route path="/ronda/parejas" element={<RondaParejasPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PersistentTabBar />
      </AuthGuard>
    </div>
  )
}
