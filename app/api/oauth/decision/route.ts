import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const decision = formData.get('decision')
  const authorizationId = formData.get('authorization_id')

  if (typeof authorizationId !== 'string' || authorizationId.length === 0) {
    return NextResponse.json({ error: 'Missing authorization_id' }, { status: 400 })
  }

  const supabase = await createClient()
  const opts = { skipBrowserRedirect: true as const }

  if (decision === 'approve') {
    const { data, error } = await supabase.auth.oauth.approveAuthorization(
      authorizationId,
      opts,
    )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const target = data?.redirect_url
    if (!target) {
      return NextResponse.json({ error: 'No redirect URL returned' }, { status: 502 })
    }
    return NextResponse.redirect(target)
  }

  if (decision === 'deny') {
    const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId, opts)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const target = data?.redirect_url
    if (!target) {
      return NextResponse.json({ error: 'No redirect URL returned' }, { status: 502 })
    }
    return NextResponse.redirect(target)
  }

  return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
}
