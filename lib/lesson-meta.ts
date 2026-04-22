import { z } from 'zod'

export const lessonSourceTypeSchema = z.enum(['pdf', 'image', 'chat'])

export const lessonMetaSchema = z.object({
  language: z.string().max(32).optional(),
  level: z.string().max(64).optional(),
})

export const generateInteractiveChatBodySchema = z.object({
  source: z.literal('chat'),
  title: z.string().max(200).optional(),
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
