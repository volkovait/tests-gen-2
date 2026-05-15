import { randomUUID } from 'node:crypto'
import { llmChatCompletion } from '@/lib/llm/chat-completion'
import { getLlmModelRepair, getLlmModelSpec } from '@/lib/llm/model-config'
import {
  LESSON_SPEC_REPAIR_SYSTEM,
  LESSON_SPEC_SYSTEM,
  MIN_FREE_GENERATION_QUESTIONS,
  buildLessonSpecEnrichmentUserPrompt,
  buildRepairUserPrompt,
  buildUserPromptForLessonEdit,
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
import { countQuestionsInLessonSpec } from '@/lib/lesson-spec/count-lesson-questions'
import { pruneLooseLessonSpecToValidModel } from '@/lib/lesson-spec/prune-invalid-lesson-questions'

function attachRuntime(parsed: ReturnType<typeof lessonSpecFromModelSchema.parse>): LessonSpec {
  const normalized = normalizeLessonSpecFromModel(parsed)
  return lessonSpecSchema.parse({
    ...normalized,
    runtime: { localStorageKey: `lesson_${randomUUID()}` },
  })
}

function lessonSpecWithoutRuntimeJson(spec: LessonSpec): string {
  const { runtime: _runtime, ...rest } = spec
  return JSON.stringify(rest)
}

const ENRICH_MATERIAL_MIN_LENGTH = 200

async function maybeEnrichLessonSpecQuestionCount(params: {
  title: string
  materialSummary: string
  result: ValidatedLessonSpecResult
  logDir?: string
}): Promise<ValidatedLessonSpecResult> {
  const materialTrimmed = params.materialSummary.trim()
  if (materialTrimmed.length < ENRICH_MATERIAL_MIN_LENGTH) {
    return params.result
  }
  const currentCount = countQuestionsInLessonSpec(params.result.spec)
  if (currentCount >= MIN_FREE_GENERATION_QUESTIONS) {
    return params.result
  }

  const enrichLog = params.logDir
    ? { outputDir: params.logDir, fileBase: 'generate-spec-enrich' as const }
    : undefined

  const enrichUser = buildLessonSpecEnrichmentUserPrompt({
    title: params.title,
    materialSummary: materialTrimmed,
    currentSpecWithoutRuntimeJson: lessonSpecWithoutRuntimeJson(params.result.spec),
    minTotalQuestions: MIN_FREE_GENERATION_QUESTIONS,
  })

  const enrichRaw = await llmChatCompletion(
    [{ role: 'system', content: LESSON_SPEC_SYSTEM }, { role: 'user', content: enrichUser }],
    {
      maxTokens: LESSON_SPEC_MAX_OUTPUT_TOKENS,
      temperature: 0.35,
      model: getLlmModelSpec(),
      ...(enrichLog ? { log: enrichLog } : {}),
    },
  )

  const parsed = tryParseModelJson(enrichRaw)
  if (!parsed.ok) {
    return params.result
  }
  coerceMcqInLessonSpecJson(parsed.value)
  const merged = finalizeLessonSpecFromLoose(parsed.value)
  if (!merged) {
    return params.result
  }
  const afterCount = countQuestionsInLessonSpec(merged.spec)
  if (afterCount <= currentCount) {
    return params.result
  }
  return merged
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

/** Лимит вывода модели для JSON-спецификации теста (`max_tokens` у LLM). */
export const LESSON_SPEC_MAX_OUTPUT_TOKENS = 20_000

export type LessonSpecGenerationProgressStage =
  | 'request_initial'
  | 'parse_initial'
  | 'validate_initial'
  | 'repair_request'
  | 'parse_repair'
  | 'validate_repair'

export type LessonSpecGenerationProgress = (stage: LessonSpecGenerationProgressStage) => void | Promise<void>

export type GenerateValidatedLessonSpecParams =
  | {
      kind: 'create'
      title: string
      materialSummary: string
      correctAnswersHint?: string
      logDir?: string
      onProgress?: LessonSpecGenerationProgress
    }
  | {
      kind: 'edit'
      title: string
      currentTestPlainText: string
      editInstruction: string
      logDir?: string
      onProgress?: LessonSpecGenerationProgress
    }

export async function generateValidatedLessonSpec(
  params: GenerateValidatedLessonSpecParams,
): Promise<ValidatedLessonSpecResult> {
  const reportProgress = async (stage: LessonSpecGenerationProgressStage) => {
    if (!params.onProgress) return
    try {
      await params.onProgress(stage)
    } catch {
      // progress-колбэк не должен ломать генерацию
    }
  }
  const log = params.logDir
    ? { outputDir: params.logDir, fileBase: 'generate-spec' as const }
    : undefined

  const userContent =
    params.kind === 'create'
      ? buildUserPromptForLessonSpec({
          title: params.title,
          materialSummary: params.materialSummary,
          ...(params.correctAnswersHint?.trim()
            ? { correctAnswersHint: params.correctAnswersHint.trim() }
            : {}),
        })
      : buildUserPromptForLessonEdit({
          title: params.title,
          currentTestPlainText: params.currentTestPlainText,
          editInstruction: params.editInstruction,
        })

  await reportProgress('request_initial')
  const raw = await llmChatCompletion(
    [{ role: 'system', content: LESSON_SPEC_SYSTEM }, { role: 'user', content: userContent }],
    {
      maxTokens: LESSON_SPEC_MAX_OUTPUT_TOKENS,
      temperature: params.kind === 'edit' ? 0.35 : 0.45,
      model: getLlmModelSpec(),
      ...(log ? { log } : {}),
    },
  )

  await reportProgress('parse_initial')
  const first = tryParseModelJson(raw)

  if (first.ok) {
    await reportProgress('validate_initial')
    coerceMcqInLessonSpecJson(first.value)
    const fromFirst = finalizeLessonSpecFromLoose(first.value)
    if (fromFirst) {
      if (params.kind === 'create') {
        return await maybeEnrichLessonSpecQuestionCount({
          title: params.title,
          materialSummary: params.materialSummary,
          result: fromFirst,
          logDir: params.logDir,
        })
      }
      return fromFirst
    }
  }

  const repairLog = params.logDir
    ? { outputDir: params.logDir, fileBase: 'generate-spec-repair' as const }
    : undefined

  const parsedFirst = first.ok ? lessonSpecFromModelSchema.safeParse(first.value) : null
  const zodMessage = first.ok
    ? parsedFirst?.success
      ? 'частичная валидация'
      : parsedFirst?.error.message ?? 'неизвестная ошибка схемы'
    : 'Ответ модели не является корректным JSON (ошибка парсинга). Исправь синтаксис: кавычки, запятые, экранирование в строках; верни один объект спецификации без текста до или после JSON.'

  const invalidJsonForRepair = first.ok
    ? typeof first.value === 'object'
      ? JSON.stringify(first.value)
      : String(raw)
    : raw.trim().slice(0, 120_000)

  await reportProgress('repair_request')
  const repairRaw = await llmChatCompletion(
    [
      { role: 'system', content: LESSON_SPEC_REPAIR_SYSTEM },
      {
        role: 'user',
        content: buildRepairUserPrompt({
          invalidJson: invalidJsonForRepair,
          zodMessage,
        }),
      },
    ],
    {
      maxTokens: LESSON_SPEC_MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      model: getLlmModelRepair(),
      ...(repairLog ? { log: repairLog } : {}),
    },
  )

  await reportProgress('parse_repair')
  const second = tryParseModelJson(repairRaw)
  if (!second.ok) {
    throw new Error('После repair модель вернула невалидный JSON')
  }

  await reportProgress('validate_repair')
  coerceMcqInLessonSpecJson(second.value)
  const fromSecond = finalizeLessonSpecFromLoose(second.value)
  if (fromSecond) {
    if (params.kind === 'create') {
      return await maybeEnrichLessonSpecQuestionCount({
        title: params.title,
        materialSummary: params.materialSummary,
        result: fromSecond,
        logDir: params.logDir,
      })
    }
    return fromSecond
  }

  throw new Error(
    'Не удалось собрать тест: после отбраковки невалидных заданий не осталось ни одного пригодного вопроса.',
  )
}
