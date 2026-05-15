import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

import { createLessonLlmModel } from '@/lib/agents/create-lesson-llm-model'
import { lessonTaskTypeIntentSchema, type LessonTaskTypeIntent } from '@/lib/lesson-generation/exercise-format-plan'

const INTENT_TOOL_INPUT = z.object({
  title: z.string().min(1).max(500).describe('Название / тема урока или теста'),
  materialSummary: z
    .string()
    .min(1)
    .max(56_000)
    .describe('Полный текст: чат, PDF, утверждённый план + материалы'),
})

const INTENT_SYSTEM = `Ты извлекаешь из материала, **какие типы интерактивных заданий** хочет преподаватель или какие следуют из явных пометок.

Возможные значения requestedFormats / primaryFormat (кроме mixed/unspecified):
- single_choice — один верный вариант (radio/select с несколькими текстовыми вариантами).
- multiple_choice — несколько верных (checkbox).
- true_false — только пары True/False (или Верно/Неверно) на языке задания.
- word_order — восстановить порядок слов или фразу/реплику (wordOrder в JSON-уроке).
- gap_drag — вставить слово(а) в пропуск(и) из банка, перетаскивание (gapDrag: один или несколько «___», лишние слова в банке допустимы).
- matching — соединить части (начала и окончания, «Match…»; matchPairs в JSON-уроке).
- mixed — пользователь явно просит **несколько разных** типов в одном уроке без одного доминирующего.
- unspecified — в тексте **нет** явного указания типа (ни MCQ, ни T/F, ни порядок слов); тогда сборщик документа решит по структуре PDF.

Правила:
- primaryFormat: если главный формат неочевиден или их несколько наравне — **не включай ключ** или поставь один литерал строкой (например строка true_false или single_choice). Никогда не возвращай объект вместо строки (в том числе пустой объект {}).
- explicitUserRequest=true, если пользователь в чате/инструкции сверху указал тип: «одиночный выбор», «множественный», «true/false», «верно-неверно», «раставьте слова», «word order», «пропуск», «соответствие», «match halves», «сопоставление», и т.п.
- Если указано только «тест по тексту» без формата — requestedFormats: [unspecified], explicitUserRequest=false.
- Если указано несколько форматов явно — mixed или перечисли несколько конкретных без mixed, если их мало (до 3).
- notesRu: одно-два предложения по-русски для лога.

Верни только структуру схемы, без рассуждений в свободной форме.`

export async function runLessonTaskTypeIntentDetection(params: {
  title: string
  materialSummary: string
}): Promise<LessonTaskTypeIntent> {
  const material = params.materialSummary.trim()
  if (material.length === 0) {
    return {
      explicitUserRequest: false,
      requestedFormats: ['unspecified'],
      notesRu: 'Пустой материал',
    }
  }

  const model = createLessonLlmModel()
  const structured = model.withStructuredOutput(lessonTaskTypeIntentSchema, { name: 'lesson_task_type_intent' })
  const userBlock = [
    `Название/тема: ${params.title.trim() || '(не указано)'}`,
    '',
    '### Материал',
    material.slice(0, 52_000),
  ].join('\n')

  let result: unknown
  try {
    result = await structured.invoke([new SystemMessage(INTENT_SYSTEM), new HumanMessage(userBlock)])
  } catch (error) {
    const detail = error instanceof Error ? error.message.trim().slice(0, 400) : 'structured output failed'
    return {
      explicitUserRequest: false,
      requestedFormats: ['unspecified'],
      notesRu: `Ошибка парсинга structured output — fallback unspecified (${detail})`,
    }
  }

  const parsed = lessonTaskTypeIntentSchema.safeParse(result)
  if (!parsed.success) {
    return {
      explicitUserRequest: false,
      requestedFormats: ['unspecified'],
      notesRu: 'Модель вернула невалидный intent — fallback unspecified',
    }
  }
  return parsed.data
}

/**
 * LangChain-tool: то же самое, что {@link runLessonTaskTypeIntentDetection}, для супервизоров/агентов.
 */
export const detectLessonTaskTypeIntentTool = tool(
  async (input: z.infer<typeof INTENT_TOOL_INPUT>) => {
    const intent = await runLessonTaskTypeIntentDetection({
      title: input.title,
      materialSummary: input.materialSummary,
    })
    return JSON.stringify(intent)
  },
  {
    name: 'detect_lesson_task_type_intent',
    description:
      'Определить по тексту пользователя и документу запрошенные типы заданий: одиночный/множественный выбор, true/false, порядок слов, пропуск. Возвращает JSON LessonTaskTypeIntent.',
    schema: INTENT_TOOL_INPUT,
  },
)
