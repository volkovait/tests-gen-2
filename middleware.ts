import { type NextRequest, NextResponse } from 'next/server'
import { isAuthDisabled } from '@/lib/auth/auth-disabled'
import { updateSession } from '@/lib/supabase/proxy'

const protectedRoutes = [
  '/dashboard',
  '/upload',
  '/test',
  '/history',
  '/create',
  '/learn',
]

function copyCookiesTo(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value)
  }
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  if (response.status >= 300 && response.status < 400) {
    return response
  }

  const { pathname } = request.nextUrl

  if (pathname === '/' && user) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    copyCookiesTo(response, redirectResponse)
    return redirectResponse
  }

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  if (!isAuthDisabled() && isProtectedRoute && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    const redirectResponse = NextResponse.redirect(loginUrl)
    copyCookiesTo(response, redirectResponse)
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
