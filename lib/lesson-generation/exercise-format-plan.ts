import { z } from 'zod'

/** Высокоуровневые форматы из намерения пользователя (до схемы lesson-spec). */
export const lessonTaskFormatKindSchema = z.enum([
  'unspecified',
  'single_choice',
  'multiple_choice',
  'true_false',
  'word_order',
  'gap_drag',
  'matching',
  'mixed',
])

export type LessonTaskFormatKind = z.infer<typeof lessonTaskFormatKindSchema>

/**
 * Модели часто отдают primaryFormat как пустой объект {} или мусор — это не проходит enum.
 * Приводим к undefined или к одному из допустимых литералов.
 */
function coercePrimaryFormatFromModel(value: unknown): unknown {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) return undefined
    const parsed = lessonTaskFormatKindSchema.safeParse(trimmed)
    return parsed.success ? parsed.data : undefined
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return undefined
  }
  return undefined
}

const primaryFormatAfterCoercionSchema = lessonTaskFormatKindSchema.optional()

export const lessonTaskTypeIntentSchema = z.object({
  explicitUserRequest: z
    .boolean()
    .describe('true — пользователь явно указал тип(ы) заданий; false — только по умолчанию из текста'),
  requestedFormats: z
    .array(lessonTaskFormatKindSchema)
    .min(1)
    .max(8)
    .describe('Что запрошено; unspecified — если тип не ясен (тогда смотри документ)'),
  primaryFormat: z
    .preprocess(coercePrimaryFormatFromModel, primaryFormatAfterCoercionSchema)
    .describe('Главный формат, если один доминирует'),
  notesRu: z.string().max(500).describe('Кратко по-русски для лога: на что опирается вывод'),
})

export type LessonTaskTypeIntent = z.infer<typeof lessonTaskTypeIntentSchema>

export const lessonSpecInputKindSchema = z.enum(['radio', 'select', 'checkbox', 'wordOrder', 'gapDrag', 'matchPairs'])

export type LessonSpecInputKindFromPlan = z.infer<typeof lessonSpecInputKindSchema>

export const partExercisePlanRowSchema = z.object({
  partIndex: z.number().int().min(0).describe('Индекс части из нарезки (0 — первая)'),
  inputKind: lessonSpecInputKindSchema.describe('Тип упражнений для этой части — строго такой во всех exercises этой части'),
  trueFalseOnly: z
    .boolean()
    .optional()
    .describe('Только для radio/select: варианты только True/False на L2'),
  exactImplementationRu: z
    .string()
    .max(800)
    .describe('По-русски: как именно реализовать тип в JSON (без HTML), чтобы совпало с PDF/чатом'),
})

export const partExercisePlanSchema = z.object({
  rows: z.array(partExercisePlanRowSchema).min(1).max(32),
})

export type PartExercisePlan = z.infer<typeof partExercisePlanSchema>
export type PartExercisePlanRow = z.infer<typeof partExercisePlanRowSchema>

export function parseTaskTypeIntentJson(raw: string): LessonTaskTypeIntent | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const data: unknown = JSON.parse(trimmed)
    const parsed = lessonTaskTypeIntentSchema.safeParse(data)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function parsePartExercisePlanJson(raw: string): PartExercisePlan | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const data: unknown = JSON.parse(trimmed)
    const parsed = partExercisePlanSchema.safeParse(data)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/** Один ряд на каждую логическую часть; дополняет недостающие индексы. */
export function normalizePartExercisePlan(
  partsLength: number,
  planRows: readonly PartExercisePlanRow[],
  intent: LessonTaskTypeIntent | null,
): PartExercisePlan {
  const length = Math.max(1, partsLength)
  const byIndex = new Map<number, PartExercisePlanRow>()
  for (const row of planRows) {
    if (row.partIndex >= 0 && row.partIndex < length) {
      byIndex.set(row.partIndex, row)
    }
  }
  const fallbackKind = defaultInputKindFromIntent(intent)
  const fallbackTf = intent?.requestedFormats.includes('true_false') ?? false
  const rows: PartExercisePlanRow[] = []
  for (let index = 0; index < length; index += 1) {
    const existing = byIndex.get(index)
    if (existing) {
      rows.push(sanitizeRow(existing))
    } else {
      rows.push({
        partIndex: index,
        inputKind: fallbackKind.kind,
        ...(fallbackKind.trueFalseOnly || fallbackTf ? { trueFalseOnly: true } : {}),
        exactImplementationRu:
          'Тип заданий не был явно выведен для этой части — возьми из общего плана/намерения пользователя и содержимого фрагмента.',
      })
    }
  }
  return { rows }
}

function sanitizeRow(row: PartExercisePlanRow): PartExercisePlanRow {
  const trueFalseOnly =
    row.inputKind === 'radio' || row.inputKind === 'select' ? Boolean(row.trueFalseOnly) : undefined
  return {
    partIndex: row.partIndex,
    inputKind: row.inputKind,
    ...(trueFalseOnly ? { trueFalseOnly } : {}),
    exactImplementationRu: row.exactImplementationRu.trim().slice(0, 800),
  }
}

function defaultInputKindFromIntent(intent: LessonTaskTypeIntent | null): {
  kind: LessonSpecInputKindFromPlan
  trueFalseOnly: boolean
} {
  if (!intent) return { kind: 'radio', trueFalseOnly: false }
  const formats = intent.requestedFormats.filter((format) => format !== 'unspecified')
  if (formats.length === 1 && formats[0] === 'true_false') return { kind: 'radio', trueFalseOnly: true }
  if (formats.includes('true_false')) return { kind: 'radio', trueFalseOnly: true }
  if (formats.includes('multiple_choice')) return { kind: 'checkbox', trueFalseOnly: false }
  if (formats.includes('word_order')) return { kind: 'wordOrder', trueFalseOnly: false }
  if (formats.includes('gap_drag')) return { kind: 'gapDrag', trueFalseOnly: false }
  if (formats.includes('matching')) return { kind: 'matchPairs', trueFalseOnly: false }
  if (formats.includes('single_choice')) return { kind: 'radio', trueFalseOnly: false }
  return { kind: 'radio', trueFalseOnly: false }
}

/**
 * Блок для user-промпта генератора JSON и планировщика: обязательное следование типам по частям.
 * @param options.partsLength — число логических частей после split_parts (для выравнивания индексов).
 */
export function formatExerciseFormatPlanForSpec(
  intentJson: string,
  planJson: string,
  options?: { partsLength?: number },
): string {
  const intent = parseTaskTypeIntentJson(intentJson)
  const rawPlan = parsePartExercisePlanJson(planJson)
  if (!intent && !rawPlan) return ''

  const header = '## План типов заданий (инструменты пайплайна — выполняй буквально)'
  const intentBlock = intent
    ? [
        '### Намерение пользователя (detect_lesson_task_type_intent)',
        '',
        '```json',
        JSON.stringify(intent, null, 2),
        '```',
        '',
      ].join('\n')
    : ''

  if (!rawPlan?.rows.length) {
    return [header, '', intentBlock.trimEnd(), '', 'Сгенерируй типы заданий по документу и намерению выше.'].join('\n')
  }

  const inferredCount =
    rawPlan.rows.length > 0 ? Math.max(...rawPlan.rows.map((row) => row.partIndex + 1)) : 1
  const partCount =
    typeof options?.partsLength === 'number' && options.partsLength > 0
      ? options.partsLength
      : inferredCount

  const plan = normalizePartExercisePlan(partCount, rawPlan.rows, intent)
  const table = plan.rows
    .map((row) => {
      const tf = row.trueFalseOnly ? ' | true/false: да' : ''
      return `- **Часть ${row.partIndex}**: inputKind=\`${row.inputKind}\`${tf} — ${row.exactImplementationRu}`
    })
    .join('\n')

  const planBlock = [
    '### Соответствие частей документа типам (map_document_parts_to_exercise_types)',
    '',
    'Для каждой части материала (разделитель `---` в блоке источника = следующая часть с тем же индексом) все упражнения в `parts[индекс].exercises[*]` должны использовать **указанный inputKind** и правила из `exactImplementationRu`. Не подменяй типы «по умолчанию».',
    '',
    table,
    '',
  ].join('\n')

  return [header, '', intentBlock.trimEnd(), '', planBlock.trimEnd()].filter((chunk) => chunk.length > 0).join('\n')
}
