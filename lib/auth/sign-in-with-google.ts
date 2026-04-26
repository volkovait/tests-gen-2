import type { SupabaseClient } from '@supabase/supabase-js'
import { getOAuthRedirectOrigin } from '@/lib/auth/oauth-redirect-origin'
import { safeInternalPath } from '@/lib/auth/safe-next-path'

/**
 * Google OAuth via Supabase (authorization code flow). Supabase calls Google’s
 * authorize/token/userinfo endpoints — you do not configure those URLs in app
 * code. In Supabase: Authentication → Sign In / Providers → Google → enable
 * and paste OAuth Client ID + Client Secret from Google Cloud Console.
 *
 * In Google Cloud: OAuth client type “Web application”, Authorized redirect URI:
 * `https://<project-ref>.supabase.co/auth/v1/callback` (from Supabase provider
 * settings). “Unsupported provider: provider is not enabled” means Google is
 * off or credentials are missing in the Supabase project.
 *
 * In Supabase: Authentication → URL Configuration — set **Site URL** to your
 * production origin (not localhost) and add `https://<prod>/auth/callback` (or
 * wildcard) under **Redirect URLs**. If `redirectTo` is not allow-listed,
 * Supabase falls back to Site URL (often still localhost).
 */
export async function signInWithGoogle(
  supabase: SupabaseClient,
  nextPath: string,
): Promise<{ error: Error | null }> {
  const next = safeInternalPath(nextPath, '/dashboard')
  const origin = getOAuthRedirectOrigin()
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
