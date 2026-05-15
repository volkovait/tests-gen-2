import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

import { createLessonLlmModel } from './create-lesson-llm-model'

const planSchema = z.object({
  planMarkdown: z
    .string()
    .min(1)
    .max(16_000)
    .describe('План урока в Markdown: цели, этапы, ключевые темы, какие типы заданий предложить'),
})

const PLAN_SYSTEM = `Ты составляешь план урока по сырому материалу пользователя.

Требования:
- Ясные цели и последовательность этапов.
- Укажи, какие блоки контента станут основой для тестов (лексика, правила, факты).
- Без лишней воды; структурируй заголовками Markdown (##, ###).
- Язык плана — русский.`

export async function generateLessonPlanDraftMarkdown(params: {
  title: string
  rawMaterialText: string
}): Promise<string> {
  const model = createLessonLlmModel()
  const structured = model.withStructuredOutput(planSchema, { name: 'lesson_plan_draft' })
  const result = await structured.invoke([
    new SystemMessage(PLAN_SYSTEM),
    new HumanMessage(
      [
        `Название/тема: ${params.title.trim() || '(не указано)'}`,
        '',
        '### Сырой материал',
        params.rawMaterialText.trim().slice(0, 48_000),
      ].join('\n'),
    ),
  ])
  const parsed = planSchema.safeParse(result)
  if (!parsed.success) {
    throw new Error(
      'Модель вернула невалидный JSON при генерации плана урока. Повторите запуск или измените материал.',
    )
  }
  return parsed.data.planMarkdown.trim()
}
