import { gigachatChatCompletion, type GigachatChatLogOptions } from '@/lib/gigachat/chat'
import type { GigaChatMessage } from '@/lib/gigachat/types'
import { polzaChatCompletion } from '@/lib/polza/chat'

import { getLlmProvider } from './provider'

export type LlmChatLogOptions = GigachatChatLogOptions

export async function llmChatCompletion(
  messages: GigaChatMessage[],
  options?: {
    temperature?: number
    maxTokens?: number
    log?: LlmChatLogOptions
    model?: string
  },
): Promise<string> {
  if (getLlmProvider() === 'polza') {
    return polzaChatCompletion(messages, options)
  }
  return gigachatChatCompletion(messages, options)
}
