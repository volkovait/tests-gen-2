const VALIDATION_WARNINGS_META_KEY = 'validationWarnings'

export function parseValidationWarningsFromLessonMeta(meta: unknown): string[] {
  if (!meta || typeof meta !== 'object') {
    return []
  }
  const record = meta as Record<string, unknown>
  const raw = record[VALIDATION_WARNINGS_META_KEY]
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function lessonPartialValidationBannerStorageKey(lessonId: string): string {
  return `lesson_partial_validation_banner_dismissed_${lessonId}`
}
