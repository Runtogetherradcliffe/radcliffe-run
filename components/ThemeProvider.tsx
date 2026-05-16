'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const LIGHT_VARS: Record<string, string> = {
  '--bg': '#f4f4f4', '--card': '#ffffff', '--card-hi': '#f0f0f0',
  '--border': '#e0e0e0', '--border-2': '#d0d0d0',
  '--orange': '#c47d0e', '--orange-lt': '#e09010', '--orange-dk': '#9a5f08',
  '--white': '#0a0a0a', '--dim': '#1a1a1a', '--muted': '#444444', '--faint': '#555555',
  '--purple': '#7c3db0', '--purple-bg': '#f0e8f8',
  '--green': '#2e7d2e', '--green-bg': '#edf7ed', '--blue': '#2d6ca6',
  '--group-green-bg': '#edf7ed', '--group-green-border': '#b8deb8',
  '--group-blue-bg': '#e8f0f8', '--group-blue-border': '#b3cceb',
  '--group-amber-bg': '#fdf3e0', '--group-amber-border': '#f0d090',
}

const LARGE_VARS: Record<string, string> = {
  '--text-xs': '13px', '--text-sm': '15px', '--text-base': '16px', '--text-md': '17px',
}

export function applyTheme(theme: string, fontsize: string) {
  const html = document.documentElement
  html.setAttribute('data-theme',    theme === 'light' ? 'light' : 'dark')
  html.setAttribute('data-fontsize', fontsize === 'large' ? 'large' : 'normal')

  if (theme === 'light') {
    Object.entries(LIGHT_VARS).forEach(([k, v]) => html.style.setProperty(k, v))
    document.body.style.background = '#f4f4f4'
    document.body.style.color      = '#1a1a1a'
  } else {
    Object.keys(LIGHT_VARS).forEach(k => html.style.removeProperty(k))
    document.body.style.background = ''
    document.body.style.color      = ''
  }

  if (fontsize === 'large') {
    Object.entries(LARGE_VARS).forEach(([k, v]) => html.style.setProperty(k, v))
  } else {
    Object.keys(LARGE_VARS).forEach(k => html.style.removeProperty(k))
  }
}

/**
 * Applies theme/font-size in two passes:
 * 1. Immediately from localStorage (no flash - matches the anti-flash inline script in layout.tsx)
 * 2. Silently syncs from Supabase in the background if the member is logged in,
 *    so a preference change on another device takes effect on next page load.
 */
export default function ThemeProvider() {
  useEffect(() => {
    // Pass 1: apply cached value instantly
    const cachedTheme    = localStorage.getItem('rtr-theme')    ?? 'dark'
    const cachedFontsize = localStorage.getItem('rtr-fontsize') ?? 'normal'
    applyTheme(cachedTheme, cachedFontsize)

    // Pass 2: sync from server if member is logged in
    async function syncFromServer() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.email) return

        const { data } = await supabase
          .from('members')
          .select('theme, font_size')
          .eq('email', session.user.email)
          .single()
        if (!data) return

        const serverTheme    = data.theme     ?? 'dark'
        const serverFontsize = data.font_size  ?? 'normal'

        if (serverTheme !== cachedTheme || serverFontsize !== cachedFontsize) {
          localStorage.setItem('rtr-theme',    serverTheme)
          localStorage.setItem('rtr-fontsize', serverFontsize)
          applyTheme(serverTheme, serverFontsize)
        }
      } catch {
        // Silently ignore - cached value already applied
      }
    }

    syncFromServer()
  }, [])

  return null
}
