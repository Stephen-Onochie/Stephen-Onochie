import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // If Supabase is not configured, allow access but show unconfigured state
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl === 'your_supabase_project_url'
  ) {
    // Not configured — redirect to home with notice
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('auth', 'not-configured')
    return NextResponse.redirect(url)
  }

  let response = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth', 'required')
      return NextResponse.redirect(url)
    }

    const allowedEmail = process.env.ALLOWED_EMAIL
    if (allowedEmail && session.user?.email !== allowedEmail) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth', 'unauthorized')
      return NextResponse.redirect(url)
    }
  } catch {
    // On error, redirect to home
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('auth', 'error')
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/apps/:path*'],
}
