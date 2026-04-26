import { safeInternalPath } from '@/lib/auth/safe-next-path'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/** Origin for redirects when behind a reverse proxy (Vercel, nginx). */
function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedHost) {
    const proto = forwardedProto ?? 'https'
    return `${proto}://${forwardedHost.split(',')[0]?.trim() ?? forwardedHost}`
  }
  return request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request)

  try {
    const code = request.nextUrl.searchParams.get('code')
    const oauthError =
      request.nextUrl.searchParams.get('error_description') ??
      request.nextUrl.searchParams.get('error')
    const next = safeInternalPath(request.nextUrl.searchParams.get('next'), '/dashboard')

    if (oauthError && !code) {
      const errUrl = new URL('/auth/error', origin)
      errUrl.searchParams.set('error', oauthError)
      return NextResponse.redirect(errUrl)
    }

    if (!code) {
      return NextResponse.redirect(new URL('/auth/error', origin))
    }

    // Cookies сессии должны попасть на тот же Response, что и редирект
    // (см. Supabase SSR + Next.js Route Handlers).
    const successTarget = new URL(next, origin)
    const redirectResponse = NextResponse.redirect(successTarget)

    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options)
          })
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const errUrl = new URL('/auth/error', origin)
      errUrl.searchParams.set('error', error.message)
      return NextResponse.redirect(errUrl)
    }

    return redirectResponse
  } catch (e) {
    const errUrl = new URL('/auth/error', origin)
    errUrl.searchParams.set(
      'error',
      e instanceof Error ? e.message : 'OAuth callback failed',
    )
    return NextResponse.redirect(errUrl)
  }
}
