import { Agent, fetch as undiciFetch } from 'undici'

import { isGigaChatTlsInsecure } from './config'

let insecureAgent: Agent | undefined

function getInsecureDispatcher(): Agent {
  insecureAgent ??= new Agent({
    connect: {
      rejectUnauthorized: false,
    },
  })
  return insecureAgent
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
  if (!isGigaChatTlsInsecure()) {
    return undiciFetch(input, init)
  }
  return undiciFetch(input, {
    ...init,
    dispatcher: getInsecureDispatcher(),
  })
}
