import type { SupabaseClient } from '@supabase/supabase-js'

import type { LessonGenerationReferenceRow } from '@/lib/lesson-generation/reference-bundle'

export async function listLessonGenerationReferences(
  supabase: SupabaseClient,
): Promise<LessonGenerationReferenceRow[]> {
  const { data, error } = await supabase
    .from('lesson_generation_references')
    .select(
      'id, slug, title, description, generation_mode, source_local_run_folder, steps, spec_json, metrics, example_lesson_id, created_at, updated_at',
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }
  return (data ?? []) as LessonGenerationReferenceRow[]
}
