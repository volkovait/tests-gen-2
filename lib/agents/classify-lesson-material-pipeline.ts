import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

import { createLessonLlmModel } from './create-lesson-llm-model'

const pipelineSchema = z.object({
  pipeline: z
    .enum(['ready_for_tests', 'needs_lesson_planning'])
    .describe(
      'ready_for_tests — уже есть тесты, задания с ответами, плотный учебный текст, из которого прямо сейчас можно собрать интерактивный тест. needs_lesson_planning — черновики, конспекты без явных вопросов, разрозненные заметки: сначала нужен план урока.',
    ),
})

const CLASSIFY_SYSTEM = `Ты классифицируешь ввод пользователя для генерации интерактивного теста.

Выбери ровно одно значение pipeline:

- ready_for_tests — материал уже пригоден для проверяемых заданий: готовые вопросы, тесты, упражнения с вариантами, плотный учебный текст с фактами, из которого можно сразу составить тест.
- needs_lesson_planning — материал сырой или разрозненный: наброски, лекции без заданий, списки тем, общий конспект — когда разумно сначала построить план урока, а уже потом тесты.

Не спрашивай пользователя уточнений — только классификация по тексту.`

export type LessonMaterialPipeline = z.infer<typeof pipelineSchema>['pipeline']

export async function classifyLessonMaterialPipeline(params: {
  title: string
  combinedUserText: string
}): Promise<LessonMaterialPipeline> {
  const block = [
    `Название/тема (если есть): ${params.title.trim() || '(не указано)'}`,
    '',
    '### Ввод пользователя',
    params.combinedUserText.trim().slice(0, 56_000),
  ].join('\n')

  const model = createLessonLlmModel()
  const structured = model.withStructuredOutput(pipelineSchema, { name: 'lesson_material_pipeline' })
  const result = await structured.invoke([new SystemMessage(CLASSIFY_SYSTEM), new HumanMessage(block)])
  const parsed = pipelineSchema.safeParse(result)
  if (!parsed.success) {
    throw new Error(
      'Классификатор сценария вернул невалидный JSON или неожиданную структуру. Повторите попытку или сократите материал.',
    )
  }
  return parsed.data.pipeline
}
