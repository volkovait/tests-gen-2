import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

import { createLessonLlmModel } from './create-lesson-llm-model'

const partsSchema = z.object({
  parts: z
    .array(z.string().min(1).max(24_000))
    .min(1)
    .max(24)
    .describe('Логические фрагменты материала по порядку; каждый — связный кусок текста для одного блока урока'),
})

const SPLIT_SYSTEM = `Ты разбиваешь учебный материал на логические части для последующей генерации уроков и тестов.

Правила:
- Сохраняй факты и формулировки исходника; не выдумывай нового содержания и **не добавляй** новых заданий, вопросов или заголовков — только нарежь уже имеющийся текст.
- **Объём:** сумма длин всех частей (символы) должна быть **не меньше 70%** длины исходного материала (без лишних пробелов в начале/конце). Если нарезка даёт почти пустой результат — верни **ровно одну** часть: весь исходный материал целиком, без сокращения.
- Каждая часть — это связный фрагмент **исходного** текста на языке оригинала (русские инструкции пользователя и английский учебный текст не смешивай в одну «переписанную» часть: сохраняй язык каждого фрагмента как в источнике).
- Части должны покрывать весь смысл исходного текста (можно слегка перекрываться на стыках).
- Один сплошной отрывок для чтения — одна часть; один блок нумерованных упражнений из учебника — одна часть; мета-инструкция пользователя отдельно — допустима отдельной короткой частью, если она явно отделена от учебного текста.`

/** Модель нарезки иногда «схлопывает» материал — тогда игнорируем её и передаём целиком. */
function splitResultLostTooMuchSource(originalTrimmed: string, parts: string[]): boolean {
  if (originalTrimmed.length < 120) {
    return false
  }
  const totalChars = parts.reduce((accumulator, part) => accumulator + part.length, 0)
  const threshold = Math.max(Math.floor(originalTrimmed.length * 0.65), 80)
  if (totalChars < threshold) {
    return true
  }
  if (totalChars < 80 && originalTrimmed.length > 200) {
    return true
  }
  return false
}

export async function splitMaterialIntoLogicalParts(params: {
  title: string
  materialText: string
}): Promise<string[]> {
  const trimmed = params.materialText.trim()
  if (trimmed.length < 400) {
    return [trimmed]
  }

  const model = createLessonLlmModel()
  const structured = model.withStructuredOutput(partsSchema, { name: 'material_parts' })
  const result = await structured.invoke([
    new SystemMessage(SPLIT_SYSTEM),
    new HumanMessage(
      [
        `Название/тема: ${params.title.trim() || '(не указано)'}`,
        '',
        '### Материал',
        trimmed.slice(0, 52_000),
      ].join('\n'),
    ),
  ])

  const parsed = partsSchema.safeParse(result)
  if (!parsed.success || parsed.data.parts.length === 0) {
    return [trimmed.slice(0, 56_000)]
  }
  const cleaned = parsed.data.parts.map((part) => part.trim()).filter((part) => part.length > 0)
  if (cleaned.length === 0) {
    return [trimmed.slice(0, 56_000)]
  }
  if (splitResultLostTooMuchSource(trimmed, cleaned)) {
    return [trimmed.slice(0, 56_000)]
  }
  return cleaned
}
