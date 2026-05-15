/**
 * Низкая уверенность в возможности собрать адекватный тест — не 5xx, а контролируемый отказ для клиента.
 */
export class LessonGenerationBlockedError extends Error {
  readonly code = 'LESSON_FEASIBILITY_LOW' as const

  constructor(readonly userMessage: string) {
    super(userMessage)
    this.name = 'LessonGenerationBlockedError'
  }
}
