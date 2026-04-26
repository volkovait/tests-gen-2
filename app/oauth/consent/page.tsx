import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { LABELS } from '@/lib/consts'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import logoImg from '@/assets/logo.png'

/** Shapes returned by `getAuthorizationDetails` when consent is required. */
type OAuthConsentDetails = {
  authorization_id: string
  redirect_uri: string
  client: { id: string; name: string; uri: string; logo_uri: string }
  user: { id: string; email: string }
  scope: string
}

function isOAuthRedirect(
  data: OAuthConsentDetails | { redirect_url: string },
): data is { redirect_url: string } {
  return (
    'redirect_url' in data &&
    typeof data.redirect_url === 'string' &&
    !('client' in data)
  )
}

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>
}) {
  const { authorization_id: authorizationId } = await searchParams

  if (!authorizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-serif">
              {LABELS.OAUTH_CONSENT_TITLE}
            </CardTitle>
            <CardDescription>{LABELS.OAUTH_CONSENT_MISSING_ID}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/auth/login">{LABELS.AUTH_SIGN_IN_LINK}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const returnTo = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`
    redirect(`/auth/login?next=${encodeURIComponent(returnTo)}`)
  }

  const { data, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId)

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-serif">
              {LABELS.OAUTH_CONSENT_TITLE}
            </CardTitle>
            <CardDescription>
              {error?.message ?? LABELS.OAUTH_CONSENT_LOAD_ERROR}
            </CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">{LABELS.NAV_CABINET}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (isOAuthRedirect(data)) {
    redirect(data.redirect_url)
  }

  const details: OAuthConsentDetails = data
  const scopes: string[] = details.scope?.trim()
    ? details.scope.trim().split(/\s+/).filter((scope) => scope.length > 0)
    : []

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 mb-2">
            <Image
              src={logoImg}
              alt={LABELS.AUTH_BRAND_LOGO_ALT}
              width={48}
              height={48}
              className="rounded-lg"
            />
            <span className="text-2xl font-serif font-bold gradient-bloom-text">
              {LABELS.AUTH_BRAND_DISPLAY}
            </span>
          </Link>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-serif">
              {LABELS.OAUTH_CONSENT_TITLE}
            </CardTitle>
            <CardDescription>{LABELS.OAUTH_CONSENT_LEAD}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {LABELS.OAUTH_CONSENT_CLIENT_LABEL}
                </p>
                <p className="text-base font-semibold mt-0.5">
                  {details.client.name || details.client.id}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {LABELS.OAUTH_CONSENT_REDIRECT_LABEL}
                </p>
                <p className="text-muted-foreground break-all mt-0.5">
                  {details.redirect_uri}
                </p>
              </div>
              {scopes.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {LABELS.OAUTH_CONSENT_SCOPES_LABEL}
                  </p>
                  <ul className="mt-1.5 list-disc list-inside text-muted-foreground">
                    {scopes.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {LABELS.OAUTH_CONSENT_ACCOUNT_LABEL}
                </p>
                <p className="mt-0.5">{details.user.email}</p>
              </div>
            </div>

            <form action="/api/oauth/decision" method="POST" className="flex flex-col gap-3 sm:flex-row">
              <input type="hidden" name="authorization_id" value={authorizationId} />
              <Button
                type="submit"
                name="decision"
                value="approve"
                className="flex-1 gradient-bloom text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {LABELS.OAUTH_CONSENT_APPROVE}
              </Button>
              <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">
                {LABELS.OAUTH_CONSENT_DENY}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
