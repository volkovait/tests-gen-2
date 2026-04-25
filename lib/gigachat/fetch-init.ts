import { Agent, fetch as undiciFetch } from 'undici'

import { isGigaChatTlsInsecure } from './config'
import { getGigaChatTlsCaBundle } from './tls-ca'

let insecureAgent: Agent | undefined
let trustedCaAgent: Agent | undefined

function getInsecureDispatcher(): Agent {
  insecureAgent ??= new Agent({
    connect: {
      rejectUnauthorized: false,
    },
  })
  return insecureAgent
}

function getTrustedCaDispatcher(ca: readonly string[]): Agent {
  trustedCaAgent ??= new Agent({
    connect: {
      rejectUnauthorized: true,
      ca: [...ca],
    },
  })
  return trustedCaAgent
}

type UndiciFetchInit = NonNullable<Parameters<typeof undiciFetch>[1]>

/**
 * HTTPS to GigaChat uses Node's undici `fetch` so `dispatcher` matches the
 * runtime `Agent` TLS options. Global `fetch` may ignore a foreign dispatcher.
 */
export function gigaChatFetch(
  input: string | URL,
  init?: UndiciFetchInit,
): ReturnType<typeof undiciFetch> {
  if (isGigaChatTlsInsecure()) {
    return undiciFetch(input, {
      ...init,
      dispatcher: getInsecureDispatcher(),
    })
  }
  const ca = getGigaChatTlsCaBundle()
  if (ca) {
    return undiciFetch(input, {
      ...init,
      dispatcher: getTrustedCaDispatcher(ca),
    })
  }
  return undiciFetch(input, init)
}
