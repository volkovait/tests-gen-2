import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

import { createLessonLlmModel } from './create-lesson-llm-model'

const detectionSchema = z.object({
  hasQuestions: z
    .boolean()
    .describe(
      'true — в материале уже есть готовые проверяемые задания для ученика (пункты теста, нумерованные задачи с ответом). false — только исходный текст/статья и/или инструкция системе создать задания, без готовых пунктов теста.',
    ),
  reason: z
    .string()
    .max(400)
    .describe('Краткое объяснение для лога (на русском, без обращения к пользователю)'),
})

const SYSTEM = `Ты детектор: есть ли в переданном тексте уже готовые проверяемые задания для ученика (а не просьба к модели/автору что-то составить).

ВАЖНО — hasQuestions=false, если единственное «про тест» — это мета-инструкция в начале или врезка к системе, без самих пунктов заданий. Примеры таких фраз (не считать за готовый тест):
- «Создай / сгенерируй / составь / придумай / напиши задания / тест / вопросы …»
- «Сделай true/false по тексту», «Make a quiz based on the text», «Generate exercises …»
- указание формата («нужны true/false», «multiple choice») без нумерованных утверждений или вопросов ниже.

hasQuestions=true только если после (или внутри) учебного блока есть конкретные пункты проверки, которые ученик должен выполнить, например:
- нумерованные задания (1., 2., …) с формулировкой проверки или полями для ответа;
- список утверждений True/False с номерами или явными метками задания;
- варианты ответов A/B/C/D, чекбоксы, пропуски «_____», таблица «верно / неверно» по пунктам;
- вопросы в учебном стиле со знаком «?» и ожидаемым ответом (не риторика в художественном диалоге).

Считай hasQuestions=false, если это в основном сплошной учебный/художественный/новостной текст, диалоги, статья, конспект — даже если сверху одна строка просит «создай тест по этому тексту». Случайные «?» в прозе и репликах персонажей не считаются заданиями.

В reason — одно короткое предложение по-русски: на что ты опираешься.`

export type DetectMaterialQuestionsResult = z.infer<typeof detectionSchema>

export async function detectMaterialContainsQuestions(params: {
  title: string
  materialText: string
}): Promise<DetectMaterialQuestionsResult> {
  const trimmed = params.materialText.trim()
  if (trimmed.length === 0) {
    return { hasQuestions: false, reason: 'Пустой материал' }
  }

  const userBlock = [
    `Название/тема: ${params.title.trim() || '(не указано)'}`,
    '',
    '### Материал',
    trimmed.slice(0, 48_000),
  ].join('\n')

  const model = createLessonLlmModel()
  const structured = model.withStructuredOutput(detectionSchema, { name: 'material_has_questions' })
  const result = await structured.invoke([new SystemMessage(SYSTEM), new HumanMessage(userBlock)])
  const parsed = detectionSchema.safeParse(result)
  if (!parsed.success) {
    return {
      hasQuestions: true,
      reason: 'Детектор вернул невалидный ответ — на всякий случай спрашиваем пользователя',
    }
  }
  return parsed.data
}
