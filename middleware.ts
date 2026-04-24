import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PREVIEW_COOKIE = 'rtr-preview'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Preview password gate ────────────────────────────────────────────────
  // Only active when PREVIEW_PASSWORD env var is set (remove var to disable)
  const previewPassword = process.env.PREVIEW_PASSWORD
  if (previewPassword) {
    const isPreviewLogin  = pathname === '/preview-login'
    const isLeaderRoute   = pathname.startsWith('/leader')
    const isAuthCallback  = pathname.startsWith('/auth/callback')
    const isSigninRoute   = pathname === '/signin'
    const isProfileRoute  = pathname === '/profile'
    const isPublicApi     = pathname.startsWith('/api/check-member')
    const authed = request.cookies.get(PREVIEW_COOKIE)?.value === previewPassword

    if (!isPreviewLogin && !isLeaderRoute && !isAuthCallback && !isSigninRoute && !isProfileRoute && !isPublicApi && !authed) {
      const url = request.nextUrl.clone()
      url.pathname = '/preview-login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  // ── Supabase session refresh + admin auth ─────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /admin (but not /admin/login)
  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginPage  = pathname === '/admin/login'

  if (isAdminRoute && !isLoginPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from login page
  if (isLoginPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  // Run on all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icons|fonts|gpx|route-maps|logo\\.png|apple-touch-icon\\.png|manifest\\.json).*)'],
}
