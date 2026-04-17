import type { SupabaseClient } from '@supabase/supabase-js'
import { safeInternalPath } from '@/lib/auth/safe-next-path'

/**
 * Google OAuth via Supabase (OAuth 2.0 authorization code flow, same idea as
 * Passport’s `passport-google-oauth` on Express — see
 * https://www.passportjs.org/tutorials/google/ — implemented here with
 * Supabase because the app is Next.js + Supabase, not Express + Passport).
 *
 * Enable the provider in Supabase: Authentication → Providers → Google.
 */
export async function signInWithGoogle(
  supabase: SupabaseClient,
  nextPath: string,
): Promise<{ error: Error | null }> {
  const next = safeInternalPath(nextPath, '/dashboard')
  const origin =
    typeof window !== 'undefined' ? window.location.origin : ''
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })

  if (error) {
    return { error: new Error(error.message) }
  }
  if (data.url) {
    window.location.assign(data.url)
    return { error: null }
  }
  return { error: new Error('No OAuth URL returned') }
}
