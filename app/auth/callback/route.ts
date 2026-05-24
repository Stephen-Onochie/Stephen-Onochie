import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/apps'
  const next = nextParam.startsWith('/') ? nextParam : '/apps'

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = next
  redirectUrl.search = ''

  if (!code) {
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'auth')
    return NextResponse.redirect(redirectUrl)
  }

  let response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.redirect(redirectUrl)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    redirectUrl.searchParams.set('error', 'auth')
    return NextResponse.redirect(redirectUrl)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && user?.email !== allowedEmail) {
    await supabase.auth.signOut()
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    redirectUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
