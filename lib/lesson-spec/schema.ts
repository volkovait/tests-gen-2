import { z } from 'zod'

export const LESSON_SPEC_VERSION = 1 as const

const optionSchema = z.object({
  key: z.string().min(1).max(8),
  text: z.string().min(1).max(2000),
})

export const readingPassageSchema = z.object({
  title: z.string().max(300).optional(),
  instruction: z.string().max(2000).optional(),
  paragraphs: z.array(z.string().min(1).max(12000)).min(1).max(40),
})

const exerciseInputKindSchema = z.enum(['radio', 'select', 'wordOrder'])

const questionSchema = z.object({
  id: z.string().min(1).max(80),
  prompt: z.string().min(1).max(4000),
  options: z.array(optionSchema).optional(),
  /** До normalize допускаем длинный ответ (текст варианта); потом сжимается к A/B/… */
  correctKey: z.string().min(1).max(2000).optional(),
  wordBank: z.array(z.string().min(1).max(200)).max(40).optional(),
  correctSentence: z.string().min(1).max(2000).optional(),
})

const exerciseSchema = z.object({
  title: z.string().min(1).max(500),
  instruction: z.string().max(4000).optional(),
  /** Показать блок-заглушку «аудио» без реального файла на сервере */
  audio: z.boolean().optional(),
  inputKind: exerciseInputKindSchema.optional().default('radio'),
  readingPassage: readingPassageSchema.optional(),
  questions: z.array(questionSchema).min(1).max(80),
})

const partSchema = z.object({
  title: z.string().min(1).max(500),
  exercises: z.array(exerciseSchema).min(1).max(40),
})

/** Поля, которые заполняет сервер после валидации модели */
export const lessonRuntimeSchema = z.object({
  localStorageKey: z.string().min(8).max(120),
})

/** То, что ожидается от модели (без runtime) */
export const lessonSpecFromModelSchema = z
  .object({
    version: z.literal(LESSON_SPEC_VERSION),
    title: z.string().min(1).max(500),
    subtitle: z.string().max(1000).optional(),
    /** Только Google Fonts CSS2 link, см. промпт */
    googleFontsHref: z
      .string()
      .url()
      .max(2000)
      .optional()
      .refine(
        (u) => u === undefined || /^https:\/\/fonts\.googleapis\.com\/css2/i.test(u),
        'googleFontsHref must be fonts.googleapis.com/css2 when set',
      ),
    parts: z.array(partSchema).min(1).max(30),
  })
  .superRefine((data, ctx) => {
    let qCount = 0
    for (let pi = 0; pi < data.parts.length; pi += 1) {
      const part = data.parts[pi]
      for (let ei = 0; ei < part.exercises.length; ei += 1) {
        const ex = part.exercises[ei]
        const kind = ex.inputKind ?? 'radio'
        for (let qi = 0; qi < ex.questions.length; qi += 1) {
          const q = ex.questions[qi]
          const qPath = ['parts', pi, 'exercises', ei, 'questions', qi] as const
          qCount += 1
          if (qCount > 200) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Слишком много вопросов (макс. 200)',
              path: ['parts'],
            })
            return
          }
          if (kind === 'wordOrder') {
            const bank = q.wordBank
            if (!bank || bank.length < 2) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Для wordOrder нужен wordBank из минимум 2 слов',
                path: [...qPath, 'wordBank'],
              })
            }
            if (!q.correctSentence?.trim()) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Для wordOrder нужен correctSentence',
                path: [...qPath, 'correctSentence'],
              })
            }
          } else {
            const opts = q.options
            if (!opts || opts.length < 2) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Для radio/select нужны options (минимум 2)',
                path: [...qPath, 'options'],
              })
            }
            const ck = q.correctKey
            if (!ck) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Нужен correctKey',
                path: [...qPath, 'correctKey'],
              })
            } else if (
              opts &&
              !opts.some(
                (o) =>
                  o.key === ck ||
                  o.text.trim().toLowerCase() === ck.trim().toLowerCase(),
              )
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `correctKey "${ck}" не совпадает ни с одним key или text в options`,
                path: [...qPath, 'correctKey'],
              })
            }
          }
        }
      }
    }
  })

export const lessonSpecSchema = lessonSpecFromModelSchema.and(
  z.object({
    runtime: lessonRuntimeSchema,
  }),
)

export type LessonSpecFromModel = z.infer<typeof lessonSpecFromModelSchema>
export type LessonSpec = z.infer<typeof lessonSpecSchema>
