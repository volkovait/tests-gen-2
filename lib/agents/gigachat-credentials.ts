import {
  getGigaChatClientId,
  getGigaChatClientSecret,
  getGigaChatPreencodedAuthorizationKey,
} from '@/lib/gigachat/config'

/** Base64 для поля `credentials` SDK GigaChat (как в OAuth Basic без префикса). */
export function getGigaChatCredentialsBase64ForSdk(): string {
  const preencoded = getGigaChatPreencodedAuthorizationKey()
  if (preencoded) {
    return preencoded
  }
  const clientId = getGigaChatClientId()
  const clientSecret = getGigaChatClientSecret()
  return Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')
}
