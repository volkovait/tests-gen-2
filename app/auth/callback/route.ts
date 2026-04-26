import { safeInternalPath } from '@/lib/auth/safe-next-path'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error')
  const next = safeInternalPath(searchParams.get('next'), '/dashboard')

  if (oauthError && !code) {
    const errUrl = new URL('/auth/error', origin)
    errUrl.searchParams.set('error', oauthError)
    return NextResponse.redirect(errUrl)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    const errUrl = new URL('/auth/error', origin)
    errUrl.searchParams.set('error', error.message)
    return NextResponse.redirect(errUrl)
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
