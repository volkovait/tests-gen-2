import { describe, expect, it } from 'vitest'

import {
  lessonTaskTypeIntentSchema,
  normalizePartExercisePlan,
  parseTaskTypeIntentJson,
  formatExerciseFormatPlanForSpec,
  type LessonTaskTypeIntent,
} from '@/lib/lesson-generation/exercise-format-plan'

describe('exercise-format-plan', () => {
  it('lessonTaskTypeIntentSchema: пустой primaryFormat {} приводится к отсутствию поля', () => {
    const raw = {
      explicitUserRequest: true,
      notesRu: 'пользователь указал типы',
      primaryFormat: {},
      requestedFormats: ['true_false', 'single_choice'],
    }
    const parsed = lessonTaskTypeIntentSchema.safeParse(raw)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.primaryFormat).toBeUndefined()
    expect(parsed.data.requestedFormats).toEqual(['true_false', 'single_choice'])
  })

  it('parseTaskTypeIntentJson принимает JSON с primaryFormat {}', () => {
    const json = JSON.stringify({
      explicitUserRequest: true,
      notesRu: 'x',
      primaryFormat: {},
      requestedFormats: ['true_false'],
    })
    const intent = parseTaskTypeIntentJson(json)
    expect(intent).not.toBeNull()
    expect(intent?.primaryFormat).toBeUndefined()
    expect(intent?.requestedFormats).toEqual(['true_false'])
  })

  it('normalizePartExercisePlan дополняет пропущенные индексы', () => {
    const intent: LessonTaskTypeIntent = {
      explicitUserRequest: true,
      requestedFormats: ['true_false'],
      notesRu: 'test',
    }
    const out = normalizePartExercisePlan(
      3,
      [{ partIndex: 1, inputKind: 'checkbox', exactImplementationRu: 'only mid' }],
      intent,
    )
    expect(out.rows).toHaveLength(3)
    expect(out.rows[0].inputKind).toBe('radio')
    expect(out.rows[0].trueFalseOnly).toBe(true)
    expect(out.rows[1].inputKind).toBe('checkbox')
    expect(out.rows[2].inputKind).toBe('radio')
  })

  it('formatExerciseFormatPlanForSpec включает таблицу частей', () => {
    const intentJson = JSON.stringify({
      explicitUserRequest: true,
      requestedFormats: ['single_choice'],
      notesRu: 'mcq',
    })
    const planJson = JSON.stringify({
      rows: [
        {
          partIndex: 0,
          inputKind: 'radio',
          exactImplementationRu: 'Первый блок — MCQ.',
        },
      ],
    })
    const block = formatExerciseFormatPlanForSpec(intentJson, planJson, { partsLength: 1 })
    expect(block).toContain('detect_lesson_task_type_intent')
    expect(block).toContain('map_document_parts_to_exercise_types')
    expect(block).toContain('Часть 0')
    expect(block).toContain('`radio`')
  })
})
