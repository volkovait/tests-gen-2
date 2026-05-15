import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

import { createLessonLlmModel } from './create-lesson-llm-model'

const relevanceSchema = z.object({
  relevant: z.boolean().describe('Подходит ли материал под критерии сценария'),
  category: z
    .string()
    .max(200)
    .optional()
    .describe('Краткая метка: tests, teaching_text, raw_notes, irrelevant, …'),
  userMessage: z
    .string()
    .max(1200)
    .describe('Короткое объяснение для пользователя на русском (при relevant=false — причина отказа)'),
})

export type MaterialRelevanceScope =
  /** Готовые тесты, учебные материалы с заданиями, тексты из которых можно собрать тест */
  | 'ready_for_interactive_tests'
  /** Сырой материал: можно ли из него спланировать урок/тесты */
  | 'raw_for_lesson_planning'

const READY_SYSTEM = `Ты узел проверки материала перед генерацией интерактивных тестов (HTML, варианты ответов, перетаскивание).

Считай relevant=true, если материал позволяет составить проверяемые задания:
- готовые тесты, контрольные, вопросы с вариантами;
- учебный текст/лексика/грамматика с явными фактами для вопросов;
- конспекты и статьи, из которых можно извлечь формулировки для теста;
- отрывок для чтения на иностранном языке **плюс** явная просьба в начале материала составить тест / true-false / вопросы по тексту (мета-инструкция без готовых пунктов теста) — это всё ещё relevant=true, если по тексту чтения можно придумать проверяемые утверждения.

Считай relevant=false для:
- случайного текста (погода, реклама, личная переписка без учебной цели);
- только списков ссылок без содержания;
- пустого или бессмысленного шума.

В userMessage при relevant=false — вежливо объясни на русском, без технических терминов.`

const RAW_SYSTEM = `Ты узел проверки СЫРОГО материала перед планированием урока.

Считай relevant=true, если из текста реально можно спланировать учебный блок (темы, цели, последовательность), даже если формулировки сырые.

Считай relevant=false, если контент не позволяет педагогически осмысленно спланировать занятие (шум, одна emoji, спам, полный оффтоп).

В userMessage при relevant=false — кратко на русском.`

export type MaterialRelevanceResult = z.infer<typeof relevanceSchema>

export async function evaluateMaterialRelevance(params: {
  scope: MaterialRelevanceScope
  title: string
  materialText: string
}): Promise<MaterialRelevanceResult> {
  const system = params.scope === 'raw_for_lesson_planning' ? RAW_SYSTEM : READY_SYSTEM
  const userBlock = [
    `Название/тема: ${params.title.trim() || '(не указано)'}`,
    '',
    '### Материал',
    params.materialText.trim().slice(0, 48_000),
  ].join('\n')

  const model = createLessonLlmModel()
  const structured = model.withStructuredOutput(relevanceSchema, { name: 'material_relevance' })

  const result = await structured.invoke([
    new SystemMessage(system),
    new HumanMessage(userBlock),
  ])

  const parsed = relevanceSchema.safeParse(result)
  if (!parsed.success) {
    return {
      relevant: false,
      category: 'parse_error',
      userMessage: 'Не удалось оценить материал. Попробуйте другой файл или более подробное описание.',
    }
  }
  return parsed.data
}
