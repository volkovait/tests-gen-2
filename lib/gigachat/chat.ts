import { getGigaChatClientIdOptional, getGigaChatModel } from './config'
import { gigaChatFetch } from './fetch-init'
import { writeModelCallLogFile } from './model-request-log'
import type { ChatCompletionResponse, GigaChatMessage } from './types'
import { getGigaChatAccessToken, gigachatChatCompletionsUrl } from './token'

function optionalClientIdHeaders(): Record<string, string> {
  const id = getGigaChatClientIdOptional()
  return id ? { 'X-Client-ID': id } : {}
}

export type GigachatChatLogOptions = {
  outputDir: string
  /** Имя файла без расширения, например `infer-title` или `generate-html`. */
  fileBase: string
}

export async function gigachatChatCompletion(
  messages: GigaChatMessage[],
  options?: { temperature?: number; maxTokens?: number; log?: GigachatChatLogOptions },
): Promise<string> {
  const token = await getGigaChatAccessToken()
  const url = gigachatChatCompletionsUrl()
  const model = getGigaChatModel()

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
      const res = await gigaChatFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...optionalClientIdHeaders(),
        },
        body: JSON.stringify(requestPayload),
      })

      httpStatus = res.status
      const text = await res.text().catch(() => '')
      rawResponseBody = text

      if (!res.ok) {
        fetchError = text.slice(0, 2000)
        throw new Error(`GigaChat chat failed: ${res.status} ${fetchError.slice(0, 500)}`)
      }

      const data = JSON.parse(text) as ChatCompletionResponse
      const content = data.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('GigaChat chat: empty content')
      }
      return content
    } catch (e) {
      if (fetchError === undefined) {
        fetchError = e instanceof Error ? e.message : String(e)
      }
      throw e
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
      } catch (e) {
        console.error('[gigachat] model request log failed', e)
      }
    }
  }
}
