import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isSupabaseConfigured() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'your_supabase_project_url'
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Supabase sometimes falls back to Site URL (/) with ?code= — forward to callback
  if (pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    if (!url.searchParams.has('next')) {
      url.searchParams.set('next', '/apps')
    }
    return NextResponse.redirect(url)
  }

  // Let the callback route handle PKCE exchange without middleware interference
  if (pathname === '/auth/callback') {
    return NextResponse.next()
  }

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')
  const isAppsRoute = pathname.startsWith('/apps')

  if (!isSupabaseConfigured()) {
    if (isAppsRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth', 'not-configured')
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (isAppsRoute) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
      }

      const allowedEmail = process.env.ALLOWED_EMAIL
      if (allowedEmail && user.email !== allowedEmail) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(url)
      }
    }

    if (pathname === '/login' && user) {
      const next = request.nextUrl.searchParams.get('next') || '/apps'
      return NextResponse.redirect(new URL(next, request.url))
    }

    if (isAuthRoute) {
      return response
    }
  } catch {
    if (isAppsRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'auth')
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
