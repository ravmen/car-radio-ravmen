import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Barlow, Share_Tech_Mono } from 'next/font/google'
import './globals.css'

const barlow = Barlow({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
})

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lcd',
})

export const metadata: Metadata = {
  title: 'Car Radio Classic',
  description:
    'Klasyczne radio samochodowe FM z dużym wyświetlaczem, presetami 1–6 i pokrętłami TUNE oraz VOLUME. Wgraj własną listę stacji M3U.',
  applicationName: 'Car Radio Classic',
  generator: 'v0.app',
  appleWebApp: {
    capable: true,
    title: 'Car Radio',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-512.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0d0f12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" className={`bg-background ${barlow.variable} ${shareTechMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
