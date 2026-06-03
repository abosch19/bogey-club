import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas — siempre accesibles
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/onboarding')

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Comprobar si existe cookie de sesión de Supabase
  const projectRef = 'qkscbeiaxflcidojlwvk'
  const sessionCookie =
    request.cookies.get(`sb-${projectRef}-auth-token`) ||
    request.cookies.get(`sb-${projectRef}-auth-token.0`) ||
    request.cookies.get('sb-access-token')

  if (!sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
