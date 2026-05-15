import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

import { createLessonLlmModel } from '@/lib/agents/create-lesson-llm-model'
import {
  lessonTaskTypeIntentSchema,
  normalizePartExercisePlan,
  partExercisePlanSchema,
  type LessonTaskTypeIntent,
  type PartExercisePlan,
} from '@/lib/lesson-generation/exercise-format-plan'

const MAP_TOOL_INPUT = z.object({
  title: z.string().min(1).max(500),
  materialSummary: z.string().min(1).max(56_000),
  logicalParts: z
    .array(z.string().min(1).max(24_000))
    .min(1)
    .max(24)
    .describe('Логические части документа в порядке следования (после split)'),
  taskTypeIntentJson: z
    .string()
    .min(2)
    .max(12_000)
    .describe('JSON от detect_lesson_task_type_intent'),
})

const MAP_SYSTEM = `Ты назначаешь **тип упражнений lesson-spec** каждой логической части загруженного документа.

Схема JSON-урока: у каждого упражнения одно поле inputKind на всё упражнение: radio | select | checkbox | wordOrder | gapDrag | matchPairs.

Правила:
- Должно быть **ровно одно** поле rows[i] на каждый индекс части от 0 до N-1, где N = число переданных фрагментов. partIndex = 0 для первого фрагмента, и т.д.
- Смотри содержание каждого фрагмента: если там уже готовые упражнения учебника с вариантами A/B/C — назначь radio или checkbox по смыслу; если блок «расставьте слова», «put the words in order», нумерованные реплики с наборами слов через символ "/" — wordOrder; если пропуски в диалоге/предложении и слова в рамке/боксе (в т.ч. несколько пропусков и лишние слова) — gapDrag; если «Match the sentence halves», две колонки (номера 1–6 и буквы A–F), соединить части — matchPairs.
- Если taskTypeIntent (из JSON пользователя) содержит explicitUserRequest и конкретный формат (например только true_false) — **для частей с генерируемыми вопросами** назначь совместимый inputKind и trueFalseOnly:true для radio/select. Не вставляй MCQ с четырьмя фразами, если запрошено только T/F.
- Часть только с просьбой пользователя без учебного текста: всё равно укажи partIndex и тип, который будет у следующего блока заданий, либо кратко укажи в exactImplementationRu «мета-инструкция — не дублировать вопросы, только переносить».
- exactImplementationRu: чёткая инструкция генератору на русском: что взять из этого фрагмента и как оформить поля questions.

Верни только объект с ключом rows по схеме.`

export async function runLessonPartExerciseTypeMap(params: {
  title: string
  materialSummary: string
  logicalParts: readonly string[]
  intent: LessonTaskTypeIntent
}): Promise<PartExercisePlan> {
  const parts = [...params.logicalParts].map((p) => p.trim()).filter((p) => p.length > 0)
  if (parts.length === 0) {
    return {
      rows: [
        {
          partIndex: 0,
          inputKind: 'radio',
          exactImplementationRu: 'Одна часть: сгенерируй задания по материалу.',
        },
      ],
    }
  }

  const model = createLessonLlmModel()
  const structured = model.withStructuredOutput(partExercisePlanSchema, { name: 'part_exercise_plan' })

  const fragments = parts
    .map((text, index) => {
      const preview = text.length > 4_000 ? `${text.slice(0, 4_000)}…` : text
      return `#### Часть ${index}\n${preview}`
    })
    .join('\n\n')

  const userBlock = [
    `Название/тема: ${params.title.trim() || '(не указано)'}`,
    '',
    '### Намерение по типам (JSON)',
    JSON.stringify(params.intent),
    '',
    `### Фрагменты документа (всего частей: ${parts.length})`,
    fragments,
    '',
    'Сформируй rows длиной ровно с числом частей; partIndex от 0 до ' + String(parts.length - 1) + '.',
  ].join('\n')

  const result = await structured.invoke([new SystemMessage(MAP_SYSTEM), new HumanMessage(userBlock)])
  const parsed = partExercisePlanSchema.safeParse(result)
  if (!parsed.success) {
    return normalizePartExercisePlan(parts.length, [], params.intent)
  }
  return normalizePartExercisePlan(parts.length, parsed.data.rows, params.intent)
}

/**
 * LangChain-tool: построить план inputKind по частям документа и намерению пользователя.
 */
export const mapDocumentPartsToExerciseTypesTool = tool(
  async (input: z.infer<typeof MAP_TOOL_INPUT>) => {
    let intent: LessonTaskTypeIntent
    try {
      const data: unknown = JSON.parse(input.taskTypeIntentJson)
      const parsed = lessonTaskTypeIntentSchema.safeParse(data)
      intent = parsed.success
        ? parsed.data
        : {
            explicitUserRequest: false,
            requestedFormats: ['unspecified'],
            notesRu: 'Невалидный taskTypeIntentJson в tool',
          }
    } catch {
      intent = {
        explicitUserRequest: false,
        requestedFormats: ['unspecified'],
        notesRu: 'taskTypeIntentJson не JSON',
      }
    }
    const plan = await runLessonPartExerciseTypeMap({
      title: input.title,
      materialSummary: input.materialSummary,
      logicalParts: input.logicalParts,
      intent,
    })
    return JSON.stringify(plan)
  },
  {
    name: 'map_document_parts_to_exercise_types',
    description:
      'По нарезанным частям документа и JSON-намерению пользователя назначить inputKind (и true/false при необходимости) для каждой части; вернуть JSON PartExercisePlan.',
    schema: MAP_TOOL_INPUT,
  },
)
