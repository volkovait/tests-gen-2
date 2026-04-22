import type { SupabaseClient } from '@supabase/supabase-js'

export type LessonSourceType = 'pdf' | 'image' | 'chat'

export async function saveLessonRow(
  supabase: SupabaseClient,
  userId: string,
  input: {
    title: string
    sourceType: LessonSourceType
    sourceFilename: string | null
    htmlBody: string
    meta?: Record<string, unknown>
  },
): Promise<string> {
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      user_id: userId,
      title: input.title,
      source_type: input.sourceType,
      source_filename: input.sourceFilename,
      html_body: input.htmlBody,
      meta: input.meta ?? {},
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }
  if (!data?.id) {
    throw new Error('Lesson insert returned no id')
  }

  try {
    await bumpLessonProgress(supabase, userId)
  } catch (e) {
    console.warn('[saveLessonRow] progress bump skipped', e)
  }
  return data.id as string
}

async function bumpLessonProgress(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: row } = await supabase
    .from('user_progress')
    .select('lessons_completed, xp')
    .eq('user_id', userId)
    .maybeSingle()

  const lessons = (row?.lessons_completed as number | undefined ?? 0) + 1
  const xp = (row?.xp as number | undefined ?? 0) + 10

  const { error } = await supabase.from('user_progress').upsert(
    {
      user_id: userId,
      lessons_completed: lessons,
      xp,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    throw error
  }

  if (lessons === 1) {
    try {
      const { error: achErr } = await supabase.from('user_achievements').upsert(
        { user_id: userId, achievement_id: 'first_lesson' },
        { onConflict: 'user_id,achievement_id' },
      )
      if (achErr) {
        console.warn('[bumpLessonProgress] achievement:', achErr.message)
      }
    } catch (e) {
      console.warn('[bumpLessonProgress] achievement skipped', e)
    }
  }
}
