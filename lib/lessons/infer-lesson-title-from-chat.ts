import { gigachatChatCompletion } from '@/lib/gigachat'
import type { GigaChatMessage } from '@/lib/gigachat/types'
import { LABELS } from '@/lib/consts'

const TITLE_HARD_MAX = 200

function clampTitle(s: string): string {
  const t = s.trim()
  if (t.length <= TITLE_HARD_MAX) return t
  return `${t.slice(0, TITLE_HARD_MAX - 1)}…`
}

function titleHeuristicFromMessages(messages: ReadonlyArray<{ role: string; content: string }>): string | null {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return null
  const collapsed = firstUser.content.replace(/\s+/g, ' ').trim()
  if (collapsed.length < 2) return null
  const max = 90
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 1)}…`
}

function sanitizeModelTitle(raw: string): string {
  let line = raw.split(/\r?\n/)[0] ?? ''
  line = line.trim()
  line = line.replace(/^["«]|["»]$/g, '').trim()
  line = line.replace(/^(название|тема|тест)\s*[:：—-]\s*/i, '').trim()
  return line
}

function buildDialogueSnippet(
  messages: ReadonlyArray<{ role: string; content: string }>,
  maxChars: number,
): string {
  const full = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n')
  if (full.length <= maxChars) return full
  return `${full.slice(0, Math.max(0, maxChars - 1))}…`
}

/**
 * Короткое название теста по переписке: сначала пробуем GigaChat, затем первую реплику пользователя, иначе дефолт.
 */
export type InferLessonTitleLogOptions = {
  /** Если задано, вызов GigaChat пишется в `infer-title.txt` в этой папке. */
  logDir?: string
}

export async function inferLessonTitleFromChat(
  messages: ReadonlyArray<{ role: string; content: string }>,
  logOptions?: InferLessonTitleLogOptions,
): Promise<string> {
  const fallback = titleHeuristicFromMessages(messages) ?? LABELS.DEFAULT_LESSON_TITLE_FROM_CHAT

  const dialogue = buildDialogueSnippet(messages, 8000)
  if (!dialogue.trim()) {
    return clampTitle(fallback)
  }

  const completionMessages: GigaChatMessage[] = [
    {
      role: 'system',
      content:
        'Ты составляешь заголовок для списка тестов в приложении. По переписке пользователя с ассистентом про языковое обучение придумай короткое название на русском: 3–10 слов, без кавычек, без префиксов вроде «Название:». Отрази тему или язык/уровень, если они явно есть. Одна строка — только заголовок.',
    },
    {
      role: 'user',
      content: `Переписка:\n\n${dialogue}\n\nЗаголовок для карточки теста (одна строка):`,
    },
  ]

  try {
    const raw = await gigachatChatCompletion(completionMessages, {
      maxTokens: 96,
      temperature: 0.35,
      ...(logOptions?.logDir
        ? { log: { outputDir: logOptions.logDir, fileBase: 'infer-title' } }
        : {}),
    })
    const cleaned = sanitizeModelTitle(raw)
    if (cleaned.length >= 3) {
      return clampTitle(cleaned)
    }
  } catch {
    // оставляем эвристику / дефолт
  }

  return clampTitle(fallback)
}
