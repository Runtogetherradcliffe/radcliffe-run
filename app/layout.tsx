import type { Metadata, Viewport } from 'next'
import './globals.css'
import NotificationOptIn from '@/components/NotificationOptIn'
import InstallPrompt from '@/components/InstallPrompt'

export const metadata: Metadata = {
  title: "radcliffe.run — Radcliffe's Running Group",
  description: 'A free, friendly running group open to everyone. No memberships, no minimum pace — just good routes and good people, every Thursday in Radcliffe, Greater Manchester.',
  metadataBase: new URL('https://radcliffe.run'),
  openGraph: {
    title: "radcliffe.run — Radcliffe's Running Group",
    description: 'A free, friendly running group open to everyone. No memberships, no minimum pace — just good routes and good people, every Thursday in Radcliffe, Greater Manchester.',
    url: 'https://radcliffe.run',
    siteName: 'radcliffe.run',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "radcliffe.run — Radcliffe's Running Group",
    description: 'A free, friendly running group open to everyone. No memberships, no minimum pace — just good routes and good people, every Thursday in Radcliffe, Greater Manchester.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'radcliffe.run',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#f5a623',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
        <InstallPrompt />
        <NotificationOptIn />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </body>
    </html>
  )
}
