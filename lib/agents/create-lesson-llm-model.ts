import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatOpenAI } from '@langchain/openai'

import { createLessonGigaChatModel } from '@/lib/agents/create-lesson-gigachat-model'
import { getLlmProvider } from '@/lib/llm/provider'
import { getPolzaApiKey, getPolzaBaseUrl, getPolzaModel } from '@/lib/polza/config'

export type CreateLessonLlmModelOptions = {
  /** Если не задано — модель по умолчанию выбранного провайдера. */
  model?: string
}

/**
 * Chat-модель LangChain для deep-agents и structured output.
 * Провайдер: Polza.ai (`LLM_PROVIDER=polza` или ключ Polza без `LLM_PROVIDER`) или GigaChat.
 */
export function createLessonLlmModel(options?: CreateLessonLlmModelOptions): BaseChatModel {
  if (getLlmProvider() === 'polza') {
    const modelName = options?.model?.trim() || getPolzaModel()
    return new ChatOpenAI({
      model: modelName,
      temperature: 0.35,
      maxTokens: 4096,
      apiKey: getPolzaApiKey(),
      configuration: { baseURL: getPolzaBaseUrl() },
    })
  }
  return createLessonGigaChatModel(options)
}
