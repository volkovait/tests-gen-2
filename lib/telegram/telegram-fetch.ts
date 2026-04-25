import { EnvHttpProxyAgent, ProxyAgent, fetch as undiciFetch } from 'undici'

import type { Dispatcher } from 'undici'

type UndiciFetchInit = NonNullable<Parameters<typeof undiciFetch>[1]>

let cachedDispatcher: Dispatcher | undefined
let cachedKey: string | undefined

/**
 * Ключ кэша диспетчера: при смене env в рантайме (тесты) пересоздаём.
 */
/** Задан ли URL прокси для исходящих запросов к Telegram (или общий HTTPS_PROXY). */
export function telegramProxyEnvIsSet(): boolean {
  return proxyConfigKey() !== null
}

function proxyConfigKey(): string | null {
  const telegramOnly = process.env.TELEGRAM_HTTPS_PROXY?.trim() ?? ''
  if (telegramOnly) return `telegram:${telegramOnly}`
  const https = process.env.HTTPS_PROXY?.trim() ?? ''
  const http = process.env.HTTP_PROXY?.trim() ?? ''
  if (https || http) {
    return `env:${https}|${http}|${process.env.NO_PROXY?.trim() ?? ''}`
  }
  return null
}

function getTelegramDispatcher(): Dispatcher | undefined {
  const key = proxyConfigKey()
  if (key === null) return undefined
  if (cachedKey === key && cachedDispatcher !== undefined) {
    return cachedDispatcher
  }
  cachedKey = key
  const telegramUri = process.env.TELEGRAM_HTTPS_PROXY?.trim()
  cachedDispatcher = telegramUri
    ? new ProxyAgent(telegramUri)
    : new EnvHttpProxyAgent()
  return cachedDispatcher
}

/**
 * Исходящий HTTPS к Bot API (`api.telegram.org`). Глобальный `fetch` не читает `HTTPS_PROXY`;
 * undici с {@link EnvHttpProxyAgent} / {@link ProxyAgent} — даёт обход блокировок через прокси.
 */
export function telegramUndiciFetch(
  input: string | URL,
  init?: UndiciFetchInit,
): ReturnType<typeof undiciFetch> {
  const dispatcher = getTelegramDispatcher()
  if (dispatcher !== undefined) {
    return undiciFetch(input, { ...init, dispatcher })
  }
  return undiciFetch(input, init)
}
