import { randomUUID } from 'node:crypto'
import { gigachatChatCompletion } from '@/lib/gigachat'
import {
  LESSON_SPEC_REPAIR_SYSTEM,
  LESSON_SPEC_SYSTEM,
  buildRepairUserPrompt,
  buildUserPromptForLessonSpec,
} from '@/lib/html-lesson/lesson-spec-prompt'
import { extractJsonDocument } from '@/lib/lesson-spec/extract-json-document'
import {
  lessonSpecFromModelSchema,
  lessonSpecSchema,
  type LessonSpec,
} from '@/lib/lesson-spec/schema'
import { coerceMcqInLessonSpecJson } from '@/lib/lesson-spec/coerce-mcq-lesson-spec'
import { normalizeLessonSpecFromModel } from '@/lib/lesson-spec/normalize-lesson-spec'
import { pruneLooseLessonSpecToValidModel } from '@/lib/lesson-spec/prune-invalid-lesson-questions'

function attachRuntime(parsed: ReturnType<typeof lessonSpecFromModelSchema.parse>): LessonSpec {
  const normalized = normalizeLessonSpecFromModel(parsed)
  return lessonSpecSchema.parse({
    ...normalized,
    runtime: { localStorageKey: `lesson_${randomUUID()}` },
  })
}

function tryParseModelJson(raw: string): { ok: true; value: unknown } | { ok: false; text: string } {
  const text = extractJsonDocument(raw)
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, text }
  }
}

export type ValidatedLessonSpecResult = {
  spec: LessonSpec
  /** Пусто, если всё прошло валидацию; иначе причины отбраковки по вопросам */
  validationWarnings: string[]
}

function finalizeLessonSpecFromLoose(loose: unknown): ValidatedLessonSpecResult | null {
  const pruned = pruneLooseLessonSpecToValidModel(loose)
  if (!pruned) return null
  return {
    spec: attachRuntime(pruned.model),
    validationWarnings: pruned.warnings,
  }
}

export async function generateValidatedLessonSpec(params: {
  title: string
  materialSummary: string
  correctAnswersHint?: string
  logDir?: string
  /** Логи: generate-spec.txt, generate-spec-repair.txt */
}): Promise<ValidatedLessonSpecResult> {
  const log = params.logDir
    ? { outputDir: params.logDir, fileBase: 'generate-spec' as const }
    : undefined

  const raw = await gigachatChatCompletion(
    [
      { role: 'system', content: LESSON_SPEC_SYSTEM },
      {
        role: 'user',
        content: buildUserPromptForLessonSpec({
          title: params.title,
          materialSummary: params.materialSummary,
          ...(params.correctAnswersHint?.trim()
            ? { correctAnswersHint: params.correctAnswersHint.trim() }
            : {}),
        }),
      },
    ],
    {
      maxTokens: 8192,
      temperature: 0.45,
      ...(log ? { log } : {}),
    },
  )

  const first = tryParseModelJson(raw)
  if (!first.ok) {
    throw new Error('Модель вернула невалидный JSON (парсинг)')
  }

  coerceMcqInLessonSpecJson(first.value)
  const fromFirst = finalizeLessonSpecFromLoose(first.value)
  if (fromFirst) {
    return fromFirst
  }

  const repairLog = params.logDir
    ? { outputDir: params.logDir, fileBase: 'generate-spec-repair' as const }
    : undefined

  const parsedFirst = lessonSpecFromModelSchema.safeParse(first.value)
  const repairRaw = await gigachatChatCompletion(
    [
      { role: 'system', content: LESSON_SPEC_REPAIR_SYSTEM },
      {
        role: 'user',
        content: buildRepairUserPrompt({
          invalidJson: typeof first.value === 'object' ? JSON.stringify(first.value) : String(raw),
          zodMessage: parsedFirst.success ? 'частичная валидация' : parsedFirst.error.message,
        }),
      },
    ],
    {
      maxTokens: 8192,
      temperature: 0.2,
      ...(repairLog ? { log: repairLog } : {}),
    },
  )

  const second = tryParseModelJson(repairRaw)
  if (!second.ok) {
    throw new Error('После repair модель вернула невалидный JSON')
  }

  coerceMcqInLessonSpecJson(second.value)
  const fromSecond = finalizeLessonSpecFromLoose(second.value)
  if (fromSecond) {
    return fromSecond
  }

  throw new Error(
    'Не удалось собрать тест: после отбраковки невалидных заданий не осталось ни одного пригодного вопроса.',
  )
}
