import { GigaChat } from 'langchain-gigachat'

import {
  getGigaChatApiUrl,
  getGigaChatModel,
  getGigaChatOAuthUrl,
  getGigaChatScope,
} from '@/lib/gigachat/config'

import { buildGigaChatSdkHttpsAgent } from './gigachat-sdk-https-agent'
import { getGigaChatCredentialsBase64ForSdk } from './gigachat-credentials'

export type CreateLessonGigaChatModelOptions = {
  /** Если не задано, используется {@link getGigaChatModel}. */
  model?: string
}

/** Chat-модель LangChain для deep-agents и structured output (GigaChat). */
export function createLessonGigaChatModel(options?: CreateLessonGigaChatModelOptions): GigaChat {
  const httpsAgent = buildGigaChatSdkHttpsAgent()
  const model = options?.model?.trim() || getGigaChatModel()
  return new GigaChat({
    credentials: getGigaChatCredentialsBase64ForSdk(),
    scope: getGigaChatScope(),
    model,
    authUrl: getGigaChatOAuthUrl(),
    baseUrl: getGigaChatApiUrl(),
    temperature: 0.35,
    maxTokens: 4096,
    ...(httpsAgent ? { httpsAgent } : {}),
  })
}
