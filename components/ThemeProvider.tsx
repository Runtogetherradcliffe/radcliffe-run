'use client'

import { useEffect } from 'react'

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
 * Reads cached theme/font-size from localStorage and applies it immediately
 * after hydration. Works alongside the anti-flash inline script in layout.tsx.
 */
export default function ThemeProvider() {
  useEffect(() => {
    const theme    = localStorage.getItem('rtr-theme')    ?? 'dark'
    const fontsize = localStorage.getItem('rtr-fontsize') ?? 'normal'
    applyTheme(theme, fontsize)
  }, [])

  return null
}
