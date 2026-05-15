import type { Metadata, Viewport } from 'next'
import './globals.css'
import NotificationOptIn from '@/components/NotificationOptIn'
import InstallPrompt from '@/components/InstallPrompt'
import ThemeProvider from '@/components/ThemeProvider'

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
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: "radcliffe.run — Radcliffe's Running Group" }],
  },
  twitter: {
    card: 'summary_large_image',
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
      <head>
        {/* Anti-flash: apply cached theme/font-size before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('rtr-theme');
            var f = localStorage.getItem('rtr-fontsize');
            var h = document.documentElement;
            if (t === 'light') {
              h.setAttribute('data-theme','light');
              var lv = {'--bg':'#f4f4f4','--card':'#ffffff','--card-hi':'#f0f0f0','--border':'#e0e0e0','--border-2':'#d0d0d0','--orange':'#c47d0e','--orange-lt':'#e09010','--orange-dk':'#9a5f08','--white':'#0a0a0a','--dim':'#1a1a1a','--muted':'#444444','--faint':'#555555','--purple':'#7c3db0','--purple-bg':'#f0e8f8','--green':'#2e7d2e','--green-bg':'#edf7ed','--blue':'#2d6ca6','--group-green-bg':'#edf7ed','--group-green-border':'#b8deb8','--group-blue-bg':'#e8f0f8','--group-blue-border':'#b3cceb','--group-amber-bg':'#fdf3e0','--group-amber-border':'#f0d090'};
              Object.keys(lv).forEach(function(k){h.style.setProperty(k,lv[k]);});
            }
            if (f === 'large') {
              h.setAttribute('data-fontsize','large');
              var fv = {'--text-xs':'13px','--text-sm':'15px','--text-base':'16px','--text-md':'17px'};
              Object.keys(fv).forEach(function(k){h.style.setProperty(k,fv[k]);});
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider />
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
