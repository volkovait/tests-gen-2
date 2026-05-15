import { writeModelCallLogFile } from '@/lib/gigachat/model-request-log'
import type { ChatCompletionResponse, GigaChatMessage } from '@/lib/gigachat/types'

import { getPolzaApiKey, getPolzaChatCompletionsUrl, getPolzaModel } from './config'

export type PolzaChatLogOptions = {
  outputDir: string
  fileBase: string
}

export async function polzaChatCompletion(
  messages: GigaChatMessage[],
  options?: {
    temperature?: number
    maxTokens?: number
    log?: PolzaChatLogOptions
    model?: string
  },
): Promise<string> {
  const url = getPolzaChatCompletionsUrl()
  const apiKey = getPolzaApiKey()
  const model = options?.model?.trim() || getPolzaModel()
  const temperature = options?.temperature ?? 0.3
  const max_tokens = options?.maxTokens ?? 4096
  const requestPayload = {
    model,
    messages,
    temperature,
    max_tokens,
  }

  const log = options?.log
  let httpStatus: number | undefined
  let rawResponseBody: string | undefined
  let fetchError: string | undefined

  try {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      })

      httpStatus = res.status
      const text = await res.text().catch(() => '')
      rawResponseBody = text

      if (!res.ok) {
        fetchError = text.slice(0, 2000)
        throw new Error(`Polza chat failed: ${res.status} ${fetchError.slice(0, 500)}`)
      }

      const data = JSON.parse(text) as ChatCompletionResponse
      const content = data.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Polza chat: empty content')
      }
      return content
    } catch (error) {
      if (fetchError === undefined) {
        fetchError = error instanceof Error ? error.message : String(error)
      }
      throw error
    }
  } finally {
    if (log) {
      try {
        await writeModelCallLogFile(log.outputDir, log.fileBase, {
          url,
          httpStatus,
          requestPayload,
          rawResponseBody,
          fetchError,
        })
      } catch (logError) {
        console.error('[polza] model request log failed', logError)
      }
    }
  }
}
