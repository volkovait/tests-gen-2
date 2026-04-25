function required(name: string): string {
  const v = process.env[name]
  if (!v?.trim()) {
    throw new Error(`${name} is not configured`)
  }
  return v.trim()
}

/** Normalizes values from .env (quotes, BOM, line breaks, accidental `Basic ` prefix). */
export function sanitizeGigaChatEnvValue(raw: string): string {
  let v = raw
    .trim()
    .replace(/^\ufeff/, '')
    .replace(/^['"]|['"]$/g, '')
  v = v.replace(/[\u200b-\u200d\ufeff\u00a0]/g, '')
  v = v.replace(/\r\n|\n|\r|\t/g, '')
  v = v.trim()
  if (/^basic\s+/i.test(v)) {
    v = v.replace(/^basic\s+/i, '').trim()
  }
  if (v.startsWith('<') && v.endsWith('>') && v.length > 2) {
    v = v.slice(1, -1).trim()
  }
  return v
}

function assertValidBase64AuthorizationKey(key: string): void {
  if (key.length % 4 === 1) {
    throw new Error(
      'GigaChat authorization key does not look like valid Base64 (wrong length). Use the Authorization Key from Studio.',
    )
  }
  if (!/^[A-Za-z0-9+/]+=*$/.test(key)) {
    throw new Error(
      'GigaChat authorization key must be standard Base64 (Studio → Authorization Key), or set GIGACHAT_CLIENT_ID + raw GIGACHAT_CLIENT_SECRET for client_credentials.',
    )
  }
}

/**
 * Use `GIGACHAT_CLIENT_SECRET` as the Studio Authorization Key (single Base64 blob for `Basic …`),
 * not as the raw Client Secret in `base64(client_id:client_secret)`.
 */
function useClientSecretAsPreencodedKey(): boolean {
  if (envFlagTruthy(process.env.GIGACHAT_PREENCODED_CLIENT_SECRET)) return true
  if (envFlagTruthy(process.env.GIGACHAT_CLIENT_SECRET_IS_AUTHORIZATION_KEY)) return true
  if (!process.env.GIGACHAT_CLIENT_ID?.trim()) return true

  const raw = process.env.GIGACHAT_CLIENT_SECRET
  if (!raw?.trim()) return false
  const compact = sanitizeGigaChatEnvValue(raw).replace(/\s+/g, '')
  if (compact.length < 96) return false
  try {
    assertValidBase64AuthorizationKey(compact)
  } catch {
    return false
  }
  return true
}

function compactAuthorizationKeyFromEnv(name: 'GIGACHAT_AUTHORIZATION_KEY' | 'GIGACHAT_CREDENTIALS'): string | null {
  const raw = process.env[name]
  if (!raw?.trim()) return null
  const compact = sanitizeGigaChatEnvValue(raw).replace(/\s+/g, '')
  if (!compact) return null
  assertValidBase64AuthorizationKey(compact)
  return compact
}

/**
 * Base64 payload for `Authorization: Basic …` (Studio **Authorization Key**), without a second encoding step.
 * Sources (first wins): `GIGACHAT_AUTHORIZATION_KEY`, `GIGACHAT_CREDENTIALS`, then `GIGACHAT_CLIENT_SECRET` when
 * there is no `GIGACHAT_CLIENT_ID`, or when `GIGACHAT_PREENCODED_CLIENT_SECRET` / `GIGACHAT_CLIENT_SECRET_IS_AUTHORIZATION_KEY` is set,
 * or when `GIGACHAT_CLIENT_SECRET` looks like a long Studio key (Base64, length ≥ 96) while `GIGACHAT_CLIENT_ID` is still used for `X-Client-ID`.
 */
export function getGigaChatPreencodedAuthorizationKey(): string | null {
  const fromAuth = compactAuthorizationKeyFromEnv('GIGACHAT_AUTHORIZATION_KEY')
  if (fromAuth) return fromAuth
  const fromCred = compactAuthorizationKeyFromEnv('GIGACHAT_CREDENTIALS')
  if (fromCred) return fromCred

  if (!useClientSecretAsPreencodedKey()) return null
  const rawSecret = process.env.GIGACHAT_CLIENT_SECRET
  if (!rawSecret?.trim()) return null
  const compact = sanitizeGigaChatEnvValue(rawSecret).replace(/\s+/g, '')
  if (!compact) return null
  assertValidBase64AuthorizationKey(compact)
  return compact
}

/** @deprecated Use {@link getGigaChatPreencodedAuthorizationKey} — same behavior, includes `GIGACHAT_AUTHORIZATION_KEY`. */
export function getGigaChatCredentialsBase64(): string | null {
  return getGigaChatPreencodedAuthorizationKey()
}

export function getGigaChatOAuthUrl(): string {
  return process.env.GIGACHAT_OAUTH_URL?.trim() || 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
}

export function getGigaChatApiUrl(): string {
  return process.env.GIGACHAT_API_URL?.trim() || 'https://gigachat.devices.sberbank.ru/api/v1'
}

/** Optional Client ID (e.g. for `X-Client-ID` on chat), same as in the axios reference. */
export function getGigaChatClientIdOptional(): string | null {
  const v = process.env.GIGACHAT_CLIENT_ID
  if (!v?.trim()) return null
  return sanitizeGigaChatEnvValue(v.trim())
}

export function getGigaChatClientId(): string {
  return sanitizeGigaChatEnvValue(required('GIGACHAT_CLIENT_ID'))
}

export function getGigaChatClientSecret(): string {
  return sanitizeGigaChatEnvValue(required('GIGACHAT_CLIENT_SECRET'))
}

export function getGigaChatScope(): string {
  return (
    process.env.GIGACHAT_OAUTH_SCOPE?.trim() ||
    process.env.GIGACHAT_SCOPE?.trim() ||
    'GIGACHAT_API_PERS'
  )
}

export function getGigaChatModel(): string {
  return process.env.GIGACHAT_MODEL?.trim() || 'GigaChat'
}

/**
 * Путь к PEM корня НУЦ Минцифры (например `russian_root.crt` из gu-st.ru).
 * Альтернатива на уровне процесса: `NODE_EXTRA_CA_CERTS` без этого кода.
 * @see https://developers.sber.ru/docs/ru/gigachat/certificates?lang=js
 */
export function getGigaChatCaCertPath(): string | null {
  const v = process.env.GIGACHAT_CA_CERT?.trim()
  if (!v) return null
  return v
}

function envFlagTruthy(raw: string | undefined): boolean {
  if (!raw) return false
  const v = raw
    .trim()
    .replace(/^\ufeff/, '')
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

/**
 * When `GIGACHAT_TLS_INSECURE` or legacy `GIGACHAT_INSECURE_TLS` is truthy, HTTPS calls
 * to GigaChat skip TLS certificate verification (e.g. corporate SSL inspection).
 * Ignored when `NODE_ENV` is `production`.
 */
export function isGigaChatTlsInsecure(): boolean {
  const enabled =
    envFlagTruthy(process.env.GIGACHAT_TLS_INSECURE) ||
    envFlagTruthy(process.env.GIGACHAT_INSECURE_TLS)
  if (!enabled) return false
  if (process.env.NODE_ENV === 'production') return false
  return true
}
