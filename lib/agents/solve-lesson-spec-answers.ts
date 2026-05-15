import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { z } from 'zod'

import { createLessonLlmModel } from './create-lesson-llm-model'
import { lessonSpecSchema, type LessonSpec } from '@/lib/lesson-spec/schema'

const patchEntrySchema = z.object({
  questionId: z.string().min(1).max(120),
  correctKey: z.string().max(80).optional(),
  correctKeys: z.array(z.string().max(80)).optional(),
  correctSentence: z.string().max(4000).optional(),
  gapCorrectToken: z.string().max(400).optional(),
  gapCorrectTokens: z.array(z.string().max(400)).max(40).optional(),
  matchCorrectKeys: z.array(z.string().max(8)).max(40).optional(),
})

const patchSchema = z.object({
  patches: z.array(patchEntrySchema).max(220),
  disclaimer: z.string().max(2000).optional(),
})

const SOLVER_SYSTEM = `Ты проверяешь интерактивный тест и подбираешь эталонные ответы по учебному материалу.

Правила:
- Используй только questionId из списка вопросов.
- Для radio/select: одно поле correctKey — буква варианта (A, B, …) как в спецификации.
- Для checkbox: correctKeys — массив букв нескольких верных вариантов.
- Для wordOrder: correctSentence — эталонное предложение теми же словами, что в wordBank.
- Для gapDrag: при одном «___» — gapCorrectToken из wordBank; при нескольких «___» в gapTemplate — gapCorrectTokens по порядку слева направо (каждый токен из wordBank с учётом лишних слов в банке).
- Для matchPairs: matchCorrectKeys — массив ключей правой колонки (A, B, …), параллельно списку matchLeftItems.
- Если не уверен, выбери наиболее правдоподобный вариант и кратко опиши риск в disclaimer (одно поле на весь ответ).

Ответ строго по схеме JSON (объект с patches).`

function flattenQuestions(spec: LessonSpec): Array<{
  questionId: string
  inputKind: string
  prompt: string
  options?: Array<{ key: string; text: string }>
  wordBank?: string[]
  gapTemplate?: string
  gapCorrectToken?: string
  gapCorrectTokens?: string[]
  matchLeftItems?: string[]
  matchRightOptions?: Array<{ key: string; text: string }>
}> {
  const out: Array<{
    questionId: string
    inputKind: string
    prompt: string
    options?: Array<{ key: string; text: string }>
    wordBank?: string[]
    gapTemplate?: string
    gapCorrectToken?: string
    gapCorrectTokens?: string[]
    matchLeftItems?: string[]
    matchRightOptions?: Array<{ key: string; text: string }>
  }> = []
  for (const part of spec.parts) {
    for (const exercise of part.exercises) {
      const inputKind = exercise.inputKind ?? 'radio'
      for (const question of exercise.questions) {
        out.push({
          questionId: question.id,
          inputKind,
          prompt: question.prompt.slice(0, 2000),
          options: question.options,
          wordBank: question.wordBank,
          ...(inputKind === 'gapDrag'
            ? {
                gapTemplate: question.gapTemplate?.slice(0, 2500),
                gapCorrectToken: question.gapCorrectToken,
                gapCorrectTokens: question.gapCorrectTokens,
              }
            : {}),
          ...(inputKind === 'matchPairs'
            ? {
                matchLeftItems: question.matchLeftItems,
                matchRightOptions: question.matchRightOptions,
              }
            : {}),
        })
      }
    }
  }
  return out
}

function applyPatches(spec: LessonSpec, patches: z.infer<typeof patchSchema>['patches']): LessonSpec {
  const clone = structuredClone(spec) as LessonSpec
  const byId = new Map(patches.map((patch) => [patch.questionId, patch]))
  for (const part of clone.parts) {
    for (const exercise of part.exercises) {
      const inputKind = exercise.inputKind ?? 'radio'
      for (const question of exercise.questions) {
        const patch = byId.get(question.id)
        if (!patch) continue
        if (patch.correctKey !== undefined && (inputKind === 'radio' || inputKind === 'select')) {
          question.correctKey = patch.correctKey
        }
        if (patch.correctKeys !== undefined && inputKind === 'checkbox') {
          question.correctKeys = patch.correctKeys
        }
        if (patch.correctSentence !== undefined && inputKind === 'wordOrder') {
          question.correctSentence = patch.correctSentence
        }
        if (inputKind === 'gapDrag') {
          if (patch.gapCorrectToken !== undefined) {
            question.gapCorrectToken = patch.gapCorrectToken
          }
          if (patch.gapCorrectTokens !== undefined) {
            question.gapCorrectTokens = patch.gapCorrectTokens
          }
        }
        if (patch.matchCorrectKeys !== undefined && inputKind === 'matchPairs') {
          question.matchCorrectKeys = patch.matchCorrectKeys
        }
      }
    }
  }
  return lessonSpecSchema.parse(clone)
}

export async function solveLessonSpecAnswersWithModel(params: {
  spec: LessonSpec
  materialSummary: string
}): Promise<{ spec: LessonSpec; disclaimer?: string }> {
  const questions = flattenQuestions(params.spec)
  const model = createLessonLlmModel()
  const structured = model.withStructuredOutput(patchSchema, { name: 'answer_solver' })
  const result = await structured.invoke([
    new SystemMessage(SOLVER_SYSTEM),
    new HumanMessage(
      [
        '### Материал',
        params.materialSummary.trim().slice(0, 40_000),
        '',
        '### Вопросы (id, тип, формулировка, варианты/банк)',
        JSON.stringify(questions, null, 0).slice(0, 120_000),
      ].join('\n'),
    ),
  ])

  const parsed = patchSchema.safeParse(result)
  if (!parsed.success) {
    return { spec: params.spec }
  }
  try {
    const next = applyPatches(params.spec, parsed.data.patches)
    return { spec: next, disclaimer: parsed.data.disclaimer }
  } catch {
    return { spec: params.spec, disclaimer: parsed.data.disclaimer }
  }
}
