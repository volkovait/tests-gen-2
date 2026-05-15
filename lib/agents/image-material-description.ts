import { Buffer } from 'node:buffer'

import { LABELS } from '@/lib/consts'
import { getLlmProvider } from '@/lib/llm/provider'
import type { ChatCompletionResponse } from '@/lib/gigachat/types'
import { getPolzaApiKey, getPolzaChatCompletionsUrl, getPolzaVisionModel } from '@/lib/polza/config'

import { createGigaChatSdkClient } from './create-gigachat-sdk'

const IMAGE_DESCRIPTION_MAX_TOKENS = 2048

async function describeImageMaterialWithPolza(params: {
  arrayBuffer: ArrayBuffer
  mimeType: string
  visionPrompt: string
}): Promise<string | null> {
  const base64 = Buffer.from(params.arrayBuffer).toString('base64')
  const dataUrl = `data:${params.mimeType};base64,${base64}`
  const url = getPolzaChatCompletionsUrl()
  const body = {
    model: getPolzaVisionModel(),
    messages: [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: params.visionPrompt },
          { type: 'image_url' as const, image_url: { url: dataUrl } },
        ],
      },
    ],
    max_tokens: IMAGE_DESCRIPTION_MAX_TOKENS,
    temperature: 0.2,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${getPolzaApiKey()}`,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text().catch(() => '')
  if (!res.ok) {
    throw new Error(`Polza vision chat failed: ${res.status} ${text.slice(0, 500)}`)
  }
  const data = JSON.parse(text) as ChatCompletionResponse
  const content = data.choices?.[0]?.message?.content
  return typeof content === 'string' && content.trim().length > 0 ? content.trim() : null
}

/**
 * Отдельный вызов модели по загруженному изображению (файл → upload → chat с attachments).
 * При ошибке API — безопасный текст-заглушка с просьбой уточнить тему.
 */
export async function describeImageMaterialForLesson(params: {
  arrayBuffer: ArrayBuffer
  mimeType: string
  fileName: string
}): Promise<string> {
  const visionPrompt = [
    'На изображении — учебный материал или страница с заданиями.',
    'Кратко и по делу опиши на русском: видимый язык, тема (грамматика/лексика), уровень если угадывается,',
    'есть ли готовые вопросы с вариантами ответов или только текст.',
    'Ничего не выдумывай: опиши только то, что можно разобрать с изображения.',
    'Это описание пойдёт в генератор интерактивного теста (radio / select / порядок слов).',
  ].join(' ')

  if (getLlmProvider() === 'polza') {
    try {
      const text = await describeImageMaterialWithPolza({
        arrayBuffer: params.arrayBuffer,
        mimeType: params.mimeType,
        visionPrompt,
      })
      if (text) {
        return [
          '## Описание загруженного изображения (автоматически)',
          text,
          '',
          `Имя файла: ${params.fileName}`,
        ].join('\n')
      }
    } catch (error) {
      console.error('[describeImageMaterialForLesson] polza', error)
    }
    return [
      LABELS.AGENT_IMAGE_DESCRIPTION_FALLBACK_INTRO,
      `Имя файла: ${params.fileName}.`,
      LABELS.AGENT_IMAGE_DESCRIPTION_FALLBACK_HINT,
    ].join(' ')
  }

  const client = createGigaChatSdkClient()
  const bytes = new Uint8Array(params.arrayBuffer)
  const blob = new Blob([bytes], { type: params.mimeType })
  const file = new File([blob], params.fileName, { type: params.mimeType })

  try {
    const uploaded = await client.uploadFile(file, 'general')
    const completion = await client.chat({
      messages: [
        {
          role: 'user',
          content: visionPrompt,
          attachments: [uploaded.id],
        },
      ],
      max_tokens: IMAGE_DESCRIPTION_MAX_TOKENS,
      temperature: 0.2,
    })
    const text = completion.choices?.[0]?.message?.content
    if (typeof text === 'string' && text.trim().length > 0) {
      return [
        '## Описание загруженного изображения (автоматически)',
        text.trim(),
        '',
        `Имя файла: ${params.fileName}`,
      ].join('\n')
    }
  } catch (error) {
    console.error('[describeImageMaterialForLesson]', error)
  }

  return [
    LABELS.AGENT_IMAGE_DESCRIPTION_FALLBACK_INTRO,
    `Имя файла: ${params.fileName}.`,
    LABELS.AGENT_IMAGE_DESCRIPTION_FALLBACK_HINT,
  ].join(' ')
}
