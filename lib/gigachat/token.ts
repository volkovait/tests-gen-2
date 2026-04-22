import {
  getGigaChatClientId,
  getGigaChatClientIdOptional,
  getGigaChatClientSecret,
  getGigaChatPreencodedAuthorizationKey,
  getGigaChatScope,
  getGigaChatOAuthUrl,
  getGigaChatApiUrl,
  isGigaChatTlsInsecure,
} from './config'
import { gigachatOAuthPostHttps } from './oauth-post'
import type { OAuthTokenResponse } from './types'

/** Same default as @see https://github.com/ai-forever/gigachat-js/blob/master/src/constants.ts */
const GIGACHAT_USER_AGENT = 'GigaChat-js-lib'

let cache: { token: string; expiresAtMs: number } | null = null

function basicAuthHeader(): string {
  const pre = getGigaChatPreencodedAuthorizationKey()
  if (pre) {
    return `Basic ${pre}`
  }
  const id = getGigaChatClientId()
  const secret = getGigaChatClientSecret()
  const raw = `${id}:${secret}`
  const b64 = Buffer.from(raw, 'utf8').toString('base64')
  return `Basic ${b64}`
}

export async function getGigaChatAccessToken(): Promise<string> {
  const now = Date.now()
  if (cache && now < cache.expiresAtMs - 60_000) {
    return cache.token
  }

  const oauthUrl = getGigaChatOAuthUrl()
  const scope = getGigaChatScope()
  const rqUid = crypto.randomUUID()

  const body = new URLSearchParams()
  body.set('scope', scope)
  const bodyStr = body.toString()

  const clientIdOpt = getGigaChatClientIdOptional()
  const oauthHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    RqUID: rqUid,
    Authorization: basicAuthHeader(),
    'User-Agent': GIGACHAT_USER_AGENT,
  }
  if (clientIdOpt) {
    oauthHeaders['X-Client-ID'] = clientIdOpt
  }

  const { statusCode, rawBody } = await gigachatOAuthPostHttps(
    oauthUrl,
    bodyStr,
    oauthHeaders,
    !isGigaChatTlsInsecure(),
  )

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`GigaChat OAuth failed: ${statusCode} ${rawBody.slice(0, 500)}`)
  }

  let data: OAuthTokenResponse
  try {
    data = JSON.parse(rawBody) as OAuthTokenResponse
  } catch {
    throw new Error('GigaChat OAuth: response is not valid JSON')
  }
  if (!data.access_token) {
    throw new Error('GigaChat OAuth: missing access_token')
  }

  const expiresInSec =
    typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : undefined

  const expiresAtMs =
    typeof expiresInSec === 'number'
      ? now + expiresInSec * 1000
      : typeof data.expires_at === 'number'
        ? data.expires_at < 1e12
          ? data.expires_at * 1000
          : data.expires_at
        : now + 25 * 60_000

  cache = { token: data.access_token, expiresAtMs }
  return data.access_token
}

export function gigachatChatCompletionsUrl(): string {
  return `${getGigaChatApiUrl().replace(/\/$/, '')}/chat/completions`
}
