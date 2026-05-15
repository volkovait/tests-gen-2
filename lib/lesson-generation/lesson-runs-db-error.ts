/** PostgREST / Supabase: таблица не создана или кэш схемы не видит таблицу. */
export function lessonRunsTableMissingHint(error: unknown): string | undefined {
  const message = error instanceof Error ? error.message : String(error)
  if (!message.includes('lesson_generation_runs')) {
    return undefined
  }
  const lower = message.toLowerCase()
  if (
    !lower.includes('schema cache') &&
    !lower.includes('does not exist') &&
    !lower.includes('relation') &&
    !lower.includes('pgrst')
  ) {
    return undefined
  }
  return 'В проекте Supabase ещё не применена миграция: откройте SQL Editor и выполните скрипт из файла supabase/migrations/20260512120000_lesson_generation_runs.sql (или выполните `supabase db push` к связанному проекту). После этого в Dashboard → Settings → API при необходимости обновите схему / перезапустите API.'
}
