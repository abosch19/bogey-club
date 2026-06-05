import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bogey Club',
  description: 'Tu app de golf con amigos',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BogeyClub',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-touch-fullscreen': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0e1a16',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans bg-[#f4f1e9] text-[#0e1a16]">
        <div className="mx-auto max-w-[430px] min-h-screen relative">
          {children}
        </div>
      </body>
    </html>
  )
}
