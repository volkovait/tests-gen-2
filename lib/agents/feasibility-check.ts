import { evaluateMaterialRelevance } from '@/lib/agents/material-relevance-check'
import { LABELS } from '@/lib/consts'

import { LessonGenerationBlockedError } from './lesson-generation-blocked-error'

export type LessonFeasibilityConfidence = 'high' | 'low'

/**
 * @deprecated Используйте {@link evaluateMaterialRelevance}; оставлено для совместимости импортов.
 */
export async function assertLessonGenerationFeasible(params: {
  title: string
  materialSummary: string
  correctAnswersHint?: string
}): Promise<void> {
  const block = [
    params.materialSummary.trim(),
    params.correctAnswersHint?.trim()
      ? `\n### Подсказки по правильным ответам\n${params.correctAnswersHint.trim().slice(0, 8000)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const result = await evaluateMaterialRelevance({
    scope: 'ready_for_interactive_tests',
    title: params.title,
    materialText: block.slice(0, 56_000),
  })

  if (!result.relevant) {
    throw new LessonGenerationBlockedError(
      result.userMessage?.trim() || LABELS.LESSON_FEASIBILITY_FALLBACK_MESSAGE,
    )
  }
}
