import { GigaChat } from 'gigachat'

import {
  getGigaChatApiUrl,
  getGigaChatModel,
  getGigaChatOAuthUrl,
  getGigaChatScope,
} from '@/lib/gigachat/config'

import { buildGigaChatSdkHttpsAgent } from './gigachat-sdk-https-agent'
import { getGigaChatCredentialsBase64ForSdk } from './gigachat-credentials'

/** Отдельный экземпляр SDK (upload файла + чат с вложениями), с TLS как в остальном приложении. */
export function createGigaChatSdkClient(): GigaChat {
  const httpsAgent = buildGigaChatSdkHttpsAgent()
  return new GigaChat({
    credentials: getGigaChatCredentialsBase64ForSdk(),
    scope: getGigaChatScope(),
    model: getGigaChatModel(),
    authUrl: getGigaChatOAuthUrl(),
    baseUrl: getGigaChatApiUrl(),
    ...(httpsAgent ? { httpsAgent } : {}),
  })
}
