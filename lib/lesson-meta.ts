import { z } from 'zod'

export const lessonSourceTypeSchema = z.enum(['pdf', 'image', 'chat'])

export const lessonMetaSchema = z.object({
  language: z.string().max(32).optional(),
  level: z.string().max(64).optional(),
})

export const generateInteractiveChatBodySchema = z.object({
  source: z.literal('chat'),
  title: z.string().max(200).optional(),
  /** Свободный текст с эталонными ответами; опционально. */
  correctAnswersHint: z.string().max(16_000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(16_000),
      }),
    )
    .min(1)
    .max(40),
})

export type GenerateInteractiveChatBody = z.infer<typeof generateInteractiveChatBodySchema>

export const lessonRunStartBodySchema = z
  .object({
    title: z.string().max(500).optional(),
    /** Текст материала без разделения на «сырой/готовый» — сценарий выбирает модель. */
    materialText: z.string().max(240_000).optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().max(16_000),
        }),
      )
      .max(60)
      .optional(),
    correctAnswersHint: z.string().max(16_000).optional(),
    /** Заранее: не спрашивать эталонные ответы — после спецификации вызвать авто-решатель. */
    autoSolveRequested: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const hasAny =
      (data.materialText?.trim().length ?? 0) > 0 || (data.messages?.length ?? 0) > 0
    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Нужен хотя бы один источник: текст материала или сообщения чата.',
      })
    }
  })

export type LessonRunStartBody = z.infer<typeof lessonRunStartBodySchema>

export const lessonRunResumeBodySchema = z.object({
  resume: z.unknown(),
})

export type LessonRunResumeBody = z.infer<typeof lessonRunResumeBodySchema>

export const lessonAssistantBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(16_000),
      }),
    )
    .min(1)
    .max(40),
})
