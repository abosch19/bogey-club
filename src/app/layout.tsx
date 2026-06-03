import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  title: 'Bogey Club',
  description: 'Tu app de golf amateur',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <div className="mx-auto max-w-[430px] min-h-screen relative">
          {children}
        </div>
      </body>
    </html>
  )
}
