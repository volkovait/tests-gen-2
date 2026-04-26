/**
 * Base URL for OAuth `redirectTo` (must be listed in Supabase → Authentication →
 * URL Configuration → Redirect URLs). When unset, the browser uses the current
 * origin — fine for local dev if localhost is allow-listed.
 */
export function getOAuthRedirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin
    } catch {
      // Invalid URL in env — fall back to window below.
    }
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
}
