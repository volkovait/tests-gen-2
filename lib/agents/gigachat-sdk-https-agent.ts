import https from 'node:https'

import { isGigaChatTlsInsecure } from '@/lib/gigachat/config'
import { getGigaChatTlsCaBundle } from '@/lib/gigachat/tls-ca'

/**
 * HTTPS-агент для axios-клиента пакета `gigachat` (тот же TLS, что и у `gigaChatFetch`).
 */
export function buildGigaChatSdkHttpsAgent(): https.Agent | undefined {
  if (isGigaChatTlsInsecure()) {
    return new https.Agent({ rejectUnauthorized: false })
  }
  const caBundle = getGigaChatTlsCaBundle()
  if (caBundle && caBundle.length > 0) {
    return new https.Agent({ ca: [...caBundle] })
  }
  return undefined
}
