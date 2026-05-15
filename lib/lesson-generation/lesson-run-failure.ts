import type { LessonGenerationState } from './state'

const FAILURE_PHASES = new Set([
  'failed',
  'build_spec_failed',
  'plan_draft_failed',
  'classify_failed',
])

const FAILURE_ERROR_CODES = new Set(['BUILD_SPEC_FAILED', 'PLAN_DRAFT_FAILED', 'CLASSIFY_FAILED'])

/** Сессия завершилась ошибкой (в т.ч. до узла fail_end, если граф остановлен на фазе). */
export function isTerminalLessonGenerationFailure(state: LessonGenerationState): boolean {
  if (FAILURE_PHASES.has(state.phase)) {
    return true
  }
  const code = state.errorCode?.trim() ?? ''
  if (code.length > 0 && FAILURE_ERROR_CODES.has(code)) {
    return true
  }
  return false
}
