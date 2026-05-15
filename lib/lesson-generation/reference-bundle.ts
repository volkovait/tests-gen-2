import { z } from 'zod'

const referenceStepSchema = z.object({
  occurred_at: z.string(),
  emoji: z.string(),
  title: z.string(),
  detail: z.string().optional(),
})

export const lessonGenerationReferenceBundleSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  generation_mode: z.enum(['ready_material', 'raw_material']).optional(),
  source_local_run_folder: z.string().optional(),
  example_lesson_id: z.string().uuid().optional(),
  metrics: z.record(z.unknown()).optional(),
  steps: z.array(referenceStepSchema),
})

export type LessonGenerationReferenceBundle = z.infer<
  typeof lessonGenerationReferenceBundleSchema
>

export type LessonGenerationReferenceRow = {
  id: string
  slug: string
  title: string
  description: string | null
  generation_mode: string | null
  source_local_run_folder: string | null
  steps: unknown
  spec_json: unknown | null
  metrics: Record<string, unknown>
  example_lesson_id: string | null
  created_at: string
  updated_at: string
}
