import { END, START, StateGraph, interrupt } from '@langchain/langgraph'
import type { BaseCheckpointSaver } from '@langchain/langgraph'

import { classifyLessonMaterialPipeline } from '@/lib/agents/classify-lesson-material-pipeline'
import { detectMaterialContainsQuestions } from '@/lib/agents/detect-material-questions'
import { evaluateMaterialRelevance } from '@/lib/agents/material-relevance-check'
import { generateLessonPlanDraftMarkdown } from '@/lib/agents/generate-lesson-plan-draft'
import { runLessonPartExerciseTypeMap } from '@/lib/agents/lesson-part-exercise-map-tool'
import { runLessonTaskTypeIntentDetection } from '@/lib/agents/lesson-task-type-intent-tool'
import { runLessonPlannerDeepAgent } from '@/lib/agents/lesson-planner-deep-agent'
import { solveLessonSpecAnswersWithModel } from '@/lib/agents/solve-lesson-spec-answers'
import { splitMaterialIntoLogicalParts } from '@/lib/agents/split-material-parts'
import { createPendingLessonLogDir, finalizeLessonLogDir } from '@/lib/gigachat/model-request-log'
import { buildLessonHtmlFromSpec } from '@/lib/html-lesson/build-lesson-html'
import { generateValidatedLessonSpec } from '@/lib/lesson-spec/generate-lesson-spec'
import { lessonSpecSchema, type LessonSpec } from '@/lib/lesson-spec/schema'

import { formatExerciseFormatPlanForSpec } from '@/lib/lesson-generation/exercise-format-plan'

import { LessonGenerationStateAnnotation, type LessonGenerationState } from './state'

export type LessonGenerationGraphDeps = {
  checkpointer: BaseCheckpointSaver
  appendEvent: (input: {
    runId: string
    emoji: string
    title: string
    detail?: string
    nodeId?: string
  }) => Promise<void>
  saveLesson: (input: {
    title: string
    sourceType: 'pdf' | 'image' | 'chat'
    sourceFilename: string | null
    htmlBody: string
    spec: LessonSpec
    meta: Record<string, unknown>
    generationRunId: string
  }) => Promise<string>
  updateRun: (input: {
    runId: string
    userId: string
    status: 'running' | 'interrupted' | 'failed' | 'completed'
    phase: string
    mode?: 'ready_material' | 'raw_material'
    lessonId?: string | null
    errorCode?: string | null
    errorMessage?: string | null
    payloadPatch?: Record<string, unknown>
  }) => Promise<void>
}

function routeAfterClassify(state: LessonGenerationState): 'relevance_raw' | 'relevance_ready' | 'fail_end' {
  if (state.phase === 'classify_failed' || state.errorCode === 'CLASSIFY_FAILED') {
    return 'fail_end'
  }
  return state.mode === 'raw_material' ? 'relevance_raw' : 'relevance_ready'
}

function routeAfterPlanDraft(state: LessonGenerationState): 'plan_hitl' | 'fail_end' {
  if (state.phase === 'plan_draft_failed' || state.errorCode === 'PLAN_DRAFT_FAILED') {
    return 'fail_end'
  }
  return 'plan_hitl'
}

function routeAfterRelevanceRaw(state: LessonGenerationState): 'plan_draft' | 'fail_end' {
  return state.materialRelevant ? 'plan_draft' : 'fail_end'
}

function routeAfterRelevanceReady(state: LessonGenerationState): 'split_parts' | 'fail_end' {
  return state.materialRelevant ? 'split_parts' : 'fail_end'
}

function routeAfterBuildSpec(state: LessonGenerationState): 'maybe_auto_solve' | 'fail_end' {
  if (state.phase === 'build_spec_failed' || state.errorCode === 'BUILD_SPEC_FAILED') {
    return 'fail_end'
  }
  return 'maybe_auto_solve'
}

function routeAfterMaybeAutoSolve(state: LessonGenerationState): 'auto_solve' | 'html_build' {
  return state.autoSolveRequested ? 'auto_solve' : 'html_build'
}

function routeAfterHtmlBuild(state: LessonGenerationState): 'publish' | 'fail_end' {
  if (state.errorCode.trim().length > 0) return 'fail_end'
  return 'publish'
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0с'
  const seconds = Math.max(1, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}с`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (rest === 0) return `${minutes}м`
  return `${minutes}м ${rest}с`
}

/** LangChain/GigaChat иногда кидают не-Error; иначе в лог попадает "[object Object]". */
function formatThrownForLog(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message: unknown }).message
    if (typeof msg === 'string' && msg.trim().length > 0) return msg
  }
  try {
    return JSON.stringify(error)
  } catch {
    return 'Неизвестная ошибка планировщика'
  }
}

export function buildLessonGenerationGraph(deps: LessonGenerationGraphDeps) {
  const graph = new StateGraph(LessonGenerationStateAnnotation)

  type GraphWiring = {
    addEdge(startKey: string, endKey: string): void
    addConditionalEdges(
      source: string,
      path: (state: LessonGenerationState) => string,
      mapping: Record<string, string>,
    ): void
  }
  const wire = graph as unknown as GraphWiring

  const logNode = (
    runId: string,
    nodeId: string,
    payload: { emoji: string; title: string; detail?: string },
  ) =>
    deps.appendEvent({
      runId,
      emoji: payload.emoji,
      title: payload.title,
      ...(payload.detail ? { detail: payload.detail } : {}),
      nodeId,
    })

  graph.addNode('ingest', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'ingest', {
      emoji: '📥',
      title: 'Узел ingest: загрузка материала',
      detail: 'Собираем текст из чата и загруженных файлов',
    })
    const combined = [state.userMaterialText, state.chatUserText]
      .filter((chunk) => chunk.trim().length > 0)
      .join('\n\n')
    const trimmed = combined.trim()
    await logNode(state.runId, 'ingest', {
      emoji: '✅',
      title: 'Узел ingest: материал готов',
      detail: `Размер материала: ${trimmed.length} симв.`,
    })
    return {
      combinedMaterial: trimmed,
      phase: 'ingest',
      title: state.title.trim() || 'Тест',
    }
  })

  graph.addNode('classify_pipeline', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'classify_pipeline', {
      emoji: '🧭',
      title: 'Узел classify_pipeline: выбор сценария',
      detail: 'Модель решает, нужен ли сначала план урока',
    })
    const started = Date.now()
    try {
      const blob = state.combinedMaterial.trim().slice(0, 56_000)
      const pipeline = await classifyLessonMaterialPipeline({
        title: state.title,
        combinedUserText: blob.length > 0 ? blob : state.title,
      })
      const mode: 'ready_material' | 'raw_material' =
        pipeline === 'needs_lesson_planning' ? 'raw_material' : 'ready_material'
      await deps.updateRun({
        runId: state.runId,
        userId: state.userId,
        status: 'running',
        phase: 'classified',
        mode,
        payloadPatch: { classifiedPipeline: pipeline },
      })
      await logNode(state.runId, 'classify_pipeline', {
        emoji: '✅',
        title: 'Узел classify_pipeline: сценарий выбран',
        detail: `Режим: ${mode === 'raw_material' ? 'сначала план урока' : 'сразу тест'} (${formatDurationMs(Date.now() - started)})`,
      })
      return { mode, phase: 'classified', errorCode: '', errorMessage: '' }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось классифицировать материал (невалидный ответ модели).'
      await logNode(state.runId, 'classify_pipeline', {
        emoji: '⚠️',
        title: 'Узел classify_pipeline: ошибка классификатора',
        detail: message.slice(0, 800),
      })
      return {
        errorCode: 'CLASSIFY_FAILED',
        errorMessage: message,
        phase: 'classify_failed',
      }
    }
  })

  graph.addNode('relevance_raw', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'relevance_raw', {
      emoji: '🔎',
      title: 'Узел relevance_raw: оценка пригодности сырого материала',
      detail: 'Запрос к модели для проверки релевантности',
    })
    const started = Date.now()
    const text = state.combinedMaterial.trim()
    const result = await evaluateMaterialRelevance({
      scope: 'raw_for_lesson_planning',
      title: state.title,
      materialText: text.slice(0, 56_000),
    })
    await logNode(state.runId, 'relevance_raw', {
      emoji: result.relevant ? '✅' : '⛔',
      title: 'Узел relevance_raw: ' + (result.relevant ? 'материал подходит' : 'материал не подходит'),
      detail: `${formatDurationMs(Date.now() - started)}${result.userMessage ? `. ${result.userMessage.slice(0, 400)}` : ''}`,
    })
    return {
      materialRelevant: result.relevant,
      relevanceUserMessage: result.userMessage,
      phase: 'relevance_raw',
    }
  })

  graph.addNode('plan_draft', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'plan_draft', {
      emoji: '📝',
      title: 'Узел plan_draft: черновик плана урока',
      detail: 'Запрос к модели на генерацию плана (markdown)',
    })
    const started = Date.now()
    try {
      const planDraft = await generateLessonPlanDraftMarkdown({
        title: state.title,
        rawMaterialText: state.combinedMaterial.trim(),
      })
      await logNode(state.runId, 'plan_draft', {
        emoji: '✅',
        title: 'Узел plan_draft: черновик готов',
        detail: `Размер плана: ${planDraft.length} симв. (${formatDurationMs(Date.now() - started)})`,
      })
      return { planDraft, phase: 'plan_draft', errorCode: '', errorMessage: '' }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось получить черновик плана (невалидный ответ модели).'
      await logNode(state.runId, 'plan_draft', {
        emoji: '⚠️',
        title: 'Узел plan_draft: черновик не получен',
        detail: message.slice(0, 800),
      })
      return {
        planDraft: '',
        errorCode: 'PLAN_DRAFT_FAILED',
        errorMessage: message,
        phase: 'plan_draft_failed',
      }
    }
  })

  graph.addNode('plan_hitl', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'plan_hitl', {
      emoji: '✋',
      title: 'Узел plan_hitl: согласование плана',
      detail: 'Ожидаем ответ пользователя (план принят как есть или с правками)',
    })
    const resume = interrupt({
      type: 'plan_approval' as const,
      planMarkdown: state.planDraft,
    })
    const edited =
      typeof resume === 'object' && resume !== null && 'editedPlanMarkdown' in resume
        ? String((resume as { editedPlanMarkdown?: string }).editedPlanMarkdown ?? '').trim()
        : ''
    const body = edited.length > 0 ? edited : state.planDraft
    const merged = [
      '## Утверждённый план\n',
      body,
      '\n\n## Исходные материалы\n',
      state.userMaterialText.trim(),
      state.chatUserText.trim(),
    ]
      .filter((chunk) => chunk.trim().length > 0)
      .join('\n\n')
    await logNode(state.runId, 'plan_hitl', {
      emoji: '✅',
      title: 'Узел plan_hitl: план принят',
      detail: edited.length > 0 ? 'Пользователь прислал отредактированный план' : 'Принят черновик без изменений',
    })
    return {
      planApprovedBody: body,
      combinedMaterial: merged.slice(0, 120_000),
      phase: 'plan_approved',
    }
  })

  graph.addNode('relevance_ready', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'relevance_ready', {
      emoji: '🎯',
      title: 'Узел relevance_ready: материал пригоден для тестов?',
      detail: 'Запрос к модели на проверку релевантности',
    })
    const started = Date.now()
    const result = await evaluateMaterialRelevance({
      scope: 'ready_for_interactive_tests',
      title: state.title,
      materialText: state.combinedMaterial.trim().slice(0, 56_000),
    })
    await logNode(state.runId, 'relevance_ready', {
      emoji: result.relevant ? '✅' : '⛔',
      title:
        'Узел relevance_ready: ' +
        (result.relevant ? 'материал подходит для теста' : 'материал не подходит'),
      detail: `${formatDurationMs(Date.now() - started)}${result.userMessage ? `. ${result.userMessage.slice(0, 400)}` : ''}`,
    })
    return {
      materialRelevant: result.relevant,
      relevanceUserMessage: result.userMessage,
      phase: 'relevance_ready',
    }
  })

  graph.addNode('split_parts', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'split_parts', {
      emoji: '✂️',
      title: 'Узел split_parts: разбиение на логические части',
      detail: 'Запрос к модели на нарезку материала',
    })
    const started = Date.now()
    const parts = await splitMaterialIntoLogicalParts({
      title: state.title,
      materialText: state.combinedMaterial.trim(),
    })
    await logNode(state.runId, 'split_parts', {
      emoji: '✅',
      title: 'Узел split_parts: материал нарезан',
      detail: `Получено частей: ${parts.length} (${formatDurationMs(Date.now() - started)})`,
    })
    return { logicalParts: parts, phase: 'split_parts' }
  })

  graph.addNode('exercise_format_plan', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'exercise_format_plan', {
      emoji: '🎯',
      title: 'Узел exercise_format_plan: типы заданий по запросу и по частям документа',
      detail: 'detect_lesson_task_type_intent + map_document_parts_to_exercise_types',
    })
    const started = Date.now()
    let taskTypeIntentJson = ''
    let partExercisePlanJson = ''
    try {
      const intent = await runLessonTaskTypeIntentDetection({
        title: state.title,
        materialSummary: state.combinedMaterial.trim(),
      })
      taskTypeIntentJson = JSON.stringify(intent)
      const plan = await runLessonPartExerciseTypeMap({
        title: state.title,
        materialSummary: state.combinedMaterial.trim(),
        logicalParts: state.logicalParts.length > 0 ? state.logicalParts : [state.combinedMaterial.trim()],
        intent,
      })
      partExercisePlanJson = JSON.stringify(plan)
      await logNode(state.runId, 'exercise_format_plan', {
        emoji: '✅',
        title: 'Узел exercise_format_plan: план типов готов',
        detail: `${intent.notesRu.slice(0, 220)}; частей в плане: ${plan.rows.length} (${formatDurationMs(Date.now() - started)})`,
      })
    } catch (error) {
      await logNode(state.runId, 'exercise_format_plan', {
        emoji: '⚠️',
        title: 'Узел exercise_format_plan: ошибка — продолжаем без плана типов',
        detail: formatThrownForLog(error).slice(0, 500),
      })
    }
    return {
      taskTypeIntentJson,
      partExercisePlanJson,
      phase: 'exercise_format_planned',
    }
  })

  graph.addNode('answers_collect', async (state: LessonGenerationState) => {
    if (state.correctAnswersHint.trim().length > 0) {
      await logNode(state.runId, 'answers_collect', {
        emoji: '🔑',
        title: 'Узел answers_collect: ответы взяты из запроса',
        detail: `Длина подсказки с ответами: ${state.correctAnswersHint.trim().length} симв.`,
      })
      return { phase: 'answers_prefilled', autoSolveRequested: false }
    }

    await logNode(state.runId, 'answers_collect', {
      emoji: '🔍',
      title: 'Узел answers_collect: проверяем, есть ли в материале готовые задания',
      detail: 'Если вопросов нет — у пользователя вряд ли есть эталонные ответы, спрашивать незачем',
    })
    const detectionStarted = Date.now()
    let hasQuestions = true
    let detectionReason = ''
    try {
      const detection = await detectMaterialContainsQuestions({
        title: state.title,
        materialText: state.combinedMaterial.trim(),
      })
      hasQuestions = detection.hasQuestions
      detectionReason = detection.reason.trim()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'detect-questions failed'
      await logNode(state.runId, 'answers_collect', {
        emoji: '⚠️',
        title: 'Узел answers_collect: детектор вопросов упал — на всякий случай спрашиваем пользователя',
        detail: message.slice(0, 400),
      })
      hasQuestions = true
    }

    if (!hasQuestions) {
      await logNode(state.runId, 'answers_collect', {
        emoji: '⏭️',
        title: 'Узел answers_collect: пропускаем (в материале нет готовых заданий)',
        detail: `${detectionReason || 'Детектор не нашёл явных вопросов/тестов'} (${formatDurationMs(Date.now() - detectionStarted)})`,
      })
      return {
        correctAnswersHint: '',
        autoSolveRequested: false,
        phase: 'answers_skipped',
      }
    }

    if (state.autoSolveRequested) {
      await logNode(state.runId, 'answers_collect', {
        emoji: '🤖',
        title: 'Узел answers_collect: ввод ответов пропущен — выбраны авто-ответы',
        detail: `${detectionReason || 'В материале есть готовые задания'} (${formatDurationMs(Date.now() - detectionStarted)}). После спецификации будет auto_solve`,
      })
      return {
        correctAnswersHint: '',
        autoSolveRequested: true,
        phase: 'answers_collected',
      }
    }

    await logNode(state.runId, 'answers_collect', {
      emoji: '✋',
      title: 'Узел answers_collect: нужны эталонные ответы',
      detail: `${detectionReason || 'В материале найдены готовые задания/вопросы'} (${formatDurationMs(Date.now() - detectionStarted)}). Ожидаем ввод пользователя`,
    })
    const resume = interrupt({
      type: 'answers' as const,
      message:
        'Пришлите правильные ответы текстом или нажмите кнопку "Автоответы модели" (точность не гарантируется).',
    })
    let autoSolveRequested = false
    let hint = ''
    if (typeof resume === 'object' && resume !== null && 'autoSolve' in resume) {
      autoSolveRequested = Boolean((resume as { autoSolve?: boolean }).autoSolve)
    } else if (typeof resume === 'string') {
      hint = resume.trim()
    } else if (typeof resume === 'object' && resume !== null && 'answersText' in resume) {
      hint = String((resume as { answersText?: string }).answersText ?? '').trim()
    }
    await logNode(state.runId, 'answers_collect', {
      emoji: '✅',
      title: 'Узел answers_collect: ввод пользователя получен',
      detail: autoSolveRequested
        ? 'Выбран авто-режим — модель сама подберёт ответы'
        : hint.length > 0
          ? `Пользователь прислал ответы (${hint.length} симв.)`
          : 'Ответы пустые — модель попробует определить ключи по материалу',
    })
    return {
      correctAnswersHint: hint,
      autoSolveRequested,
      phase: 'answers_collected',
    }
  })

  graph.addNode('build_spec', async (state: LessonGenerationState) => {
    const buildStarted = Date.now()
    await logNode(state.runId, 'build_spec', {
      emoji: '🧩',
      title: 'Узел build_spec: генерация спецификации теста',
      detail: 'Это самый длительный шаг (обычно 1–3 минуты)',
    })
    const pendingLog = await createPendingLessonLogDir()
    const logDir = state.logDir.trim().length > 0 ? state.logDir.trim() : pendingLog ?? ''
    const combinedTrimmed = state.combinedMaterial.trim()
    let materialJoined = state.logicalParts.length
      ? state.logicalParts.join('\n\n---\n\n')
      : combinedTrimmed
    if (
      combinedTrimmed.length >= 120 &&
      materialJoined.length < Math.max(Math.floor(combinedTrimmed.length * 0.65), 80)
    ) {
      materialJoined = combinedTrimmed
    }

    const exercisePlanBlock = formatExerciseFormatPlanForSpec(
      state.taskTypeIntentJson?.trim() ?? '',
      state.partExercisePlanJson?.trim() ?? '',
      { partsLength: state.logicalParts.length > 0 ? state.logicalParts.length : 1 },
    )
    const materialWithExercisePlan = exercisePlanBlock
      ? `${exercisePlanBlock}\n\n${materialJoined}`
      : materialJoined

    await logNode(state.runId, 'build_spec', {
      emoji: '🛠️',
      title: 'build_spec: планировщик (deep agent) — старт',
      detail: `Материал: ${materialWithExercisePlan.length} симв., частей: ${state.logicalParts.length}`,
    })
    const plannerStarted = Date.now()
    let plannerBrief = ''
    try {
      plannerBrief = await runLessonPlannerDeepAgent(
        [`Название/тема: ${state.title}`, '', materialWithExercisePlan].join('\n'),
      )
      await logNode(state.runId, 'build_spec', {
        emoji: '✅',
        title: 'build_spec: планировщик — бриф готов',
        detail: `Длина брифа: ${plannerBrief.trim().length} симв. (${formatDurationMs(Date.now() - plannerStarted)})`,
      })
    } catch (error) {
      const message = formatThrownForLog(error)
      plannerBrief = ''
      await logNode(state.runId, 'build_spec', {
        emoji: '⚠️',
        title: 'build_spec: планировщик завершился с ошибкой — продолжаем без брифа',
        detail: `${message.slice(0, 400)} (${formatDurationMs(Date.now() - plannerStarted)})`,
      })
    }

    const materialWithPlanner =
      plannerBrief.trim().length > 0
        ? `${materialWithExercisePlan}\n\n## Бриф планировщика (deep agent)\n${plannerBrief.trim()}`
        : materialWithExercisePlan
    try {
      const stageStartedAt: { value: number } = { value: Date.now() }
      const { spec, validationWarnings } = await generateValidatedLessonSpec({
        kind: 'create',
        title: state.title,
        materialSummary: materialWithPlanner,
        ...(state.correctAnswersHint.trim() ? { correctAnswersHint: state.correctAnswersHint.trim() } : {}),
        ...(logDir ? { logDir } : {}),
        onProgress: async (stage) => {
          const now = Date.now()
          const elapsedSinceStage = formatDurationMs(now - stageStartedAt.value)
          stageStartedAt.value = now
          switch (stage) {
            case 'request_initial':
              await logNode(state.runId, 'build_spec', {
                emoji: '✍️',
                title: 'build_spec: GigaChat — запрос JSON-спецификации',
                detail: 'Отправляем основной промпт, ждём ответ модели',
              })
              return
            case 'parse_initial':
              await logNode(state.runId, 'build_spec', {
                emoji: '📥',
                title: 'build_spec: GigaChat — ответ получен, парсим JSON',
                detail: `Время ответа модели: ${elapsedSinceStage}`,
              })
              return
            case 'validate_initial':
              await logNode(state.runId, 'build_spec', {
                emoji: '🔍',
                title: 'build_spec: валидация JSON-спецификации',
                detail: 'Проверяем схему и отбраковываем невалидные вопросы',
              })
              return
            case 'repair_request':
              await logNode(state.runId, 'build_spec', {
                emoji: '🛠️',
                title: 'build_spec: запрос repair — модель чинит JSON',
                detail: 'Первая попытка не прошла валидацию — отправляем дополнительный промпт',
              })
              return
            case 'parse_repair':
              await logNode(state.runId, 'build_spec', {
                emoji: '📥',
                title: 'build_spec: repair — ответ получен, парсим JSON',
                detail: `Время ответа модели: ${elapsedSinceStage}`,
              })
              return
            case 'validate_repair':
              await logNode(state.runId, 'build_spec', {
                emoji: '🔍',
                title: 'build_spec: валидация repair-JSON',
                detail: 'Финальная проверка спецификации после repair',
              })
              return
          }
        },
      })
      const specWithRuntime: LessonSpec = lessonSpecSchema.parse(spec)
      await logNode(state.runId, 'build_spec', {
        emoji: '✅',
        title: 'Узел build_spec: спецификация теста готова',
        detail: `Длина JSON: ${JSON.stringify(specWithRuntime).length} симв., предупреждений валидации: ${validationWarnings.length} (всего ${formatDurationMs(Date.now() - buildStarted)})`,
      })
      return {
        lessonSpecJson: JSON.stringify(specWithRuntime),
        validationWarnings,
        buildSpecAttempts: state.buildSpecAttempts + 1,
        phase: 'build_spec',
        errorCode: '',
        errorMessage: '',
        ...(logDir.length > 0 && !state.logDir.trim() ? { logDir } : {}),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'generateValidatedLessonSpec failed'
      await logNode(state.runId, 'build_spec', {
        emoji: '⚠️',
        title: 'Узел build_spec: ошибка спецификации теста',
        detail: `${message.slice(0, 1000)} (всего ${formatDurationMs(Date.now() - buildStarted)})`,
      })
      return {
        errorCode: 'BUILD_SPEC_FAILED',
        errorMessage: message,
        phase: 'build_spec_failed',
      }
    }
  })

  graph.addNode('maybe_auto_solve', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'maybe_auto_solve', {
      emoji: '🔀',
      title: 'Узел maybe_auto_solve: ветвление',
      detail: state.autoSolveRequested
        ? 'Пользователь выбрал авто-ответы — идём в auto_solve'
        : 'Ключи уже определены модельным шагом или пользователем — идём сразу в html_build',
    })
    return { phase: 'maybe_auto_solve' }
  })

  graph.addNode('auto_solve', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'auto_solve', {
      emoji: '🤖',
      title: 'Узел auto_solve: автоматическое определение ответов',
      detail: 'Модель заполняет ключи по материалу',
    })
    if (!state.lessonSpecJson) {
      await logNode(state.runId, 'auto_solve', {
        emoji: 'ℹ️',
        title: 'Узел auto_solve: пропущен',
        detail: 'Нет lessonSpecJson — нечем заполнять ключи',
      })
      return { autoSolveRequested: false, phase: 'auto_solve_skipped' }
    }
    const parsed = JSON.parse(state.lessonSpecJson) as unknown
    const specOnly = lessonSpecSchema.safeParse(parsed)
    if (!specOnly.success) {
      await logNode(state.runId, 'auto_solve', {
        emoji: 'ℹ️',
        title: 'Узел auto_solve: пропущен',
        detail: 'lessonSpecJson не проходит схему',
      })
      return { autoSolveRequested: false, phase: 'auto_solve_skipped' }
    }
    const materialJoined = state.logicalParts.length
      ? state.logicalParts.join('\n\n')
      : state.combinedMaterial.trim()
    const started = Date.now()
    const { spec, disclaimer } = await solveLessonSpecAnswersWithModel({
      spec: specOnly.data,
      materialSummary: materialJoined,
    })
    await logNode(state.runId, 'auto_solve', {
      emoji: '✅',
      title: 'Узел auto_solve: ключи заполнены',
      detail: `${formatDurationMs(Date.now() - started)}${disclaimer ? `. ${disclaimer.slice(0, 300)}` : ''}`,
    })
    return {
      lessonSpecJson: JSON.stringify(spec),
      autoSolveRequested: false,
      autoSolveDisclaimer: disclaimer ?? '',
      phase: 'auto_solve_done',
    }
  })

  graph.addNode('html_build', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'html_build', {
      emoji: '🌐',
      title: 'Узел html_build: сборка HTML по спецификации',
      detail: 'Локальный рендер без запроса к модели',
    })
    if (!state.lessonSpecJson) {
      await logNode(state.runId, 'html_build', {
        emoji: '⚠️',
        title: 'Узел html_build: ошибка',
        detail: 'Нет спецификации в состоянии',
      })
      return {
        errorCode: 'NO_SPEC',
        errorMessage: 'Нет спецификации',
        phase: 'html_failed',
      }
    }
    const started = Date.now()
    const spec = lessonSpecSchema.parse(JSON.parse(state.lessonSpecJson) as unknown)
    const html = buildLessonHtmlFromSpec(spec)
    await logNode(state.runId, 'html_build', {
      emoji: '✅',
      title: 'Узел html_build: HTML собран',
      detail: `Размер HTML: ${html.length} симв. (${formatDurationMs(Date.now() - started)})`,
    })
    return { htmlBody: html, phase: 'html_build', errorCode: '', errorMessage: '' }
  })

  graph.addNode('publish', async (state: LessonGenerationState) => {
    await logNode(state.runId, 'publish', {
      emoji: '🚀',
      title: 'Узел publish: публикация теста',
      detail: 'Сохраняем lesson в БД и финализируем логи',
    })
    if (!state.lessonSpecJson || !state.htmlBody) {
      await logNode(state.runId, 'publish', {
        emoji: '⚠️',
        title: 'Узел publish: ошибка',
        detail: 'Нет HTML или спецификации',
      })
      await deps.updateRun({
        runId: state.runId,
        userId: state.userId,
        status: 'failed',
        phase: 'publish_failed',
        errorCode: 'PUBLISH_INCOMPLETE',
        errorMessage: 'Нет HTML или спецификации',
      })
      return { phase: 'publish_failed' }
    }
    const started = Date.now()
    const spec = lessonSpecSchema.parse(JSON.parse(state.lessonSpecJson) as unknown)
    const meta: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
      lessonEngine: 'spec-v1-supervisor',
      generationRunId: state.runId,
      ...(state.autoSolveDisclaimer ? { autoSolveDisclaimer: state.autoSolveDisclaimer } : {}),
      ...(state.validationWarnings.length > 0
        ? {
            validationWarnings: state.validationWarnings,
            ...(state.lessonSourceType === 'pdf' || state.lessonSourceType === 'image'
              ? { partialSourceIngest: true }
              : {}),
          }
        : {}),
    }
    const lessonId = await deps.saveLesson({
      title: state.title,
      sourceType: state.lessonSourceType,
      sourceFilename: null,
      htmlBody: state.htmlBody,
      spec,
      meta,
      generationRunId: state.runId,
    })
    if (state.logDir.trim().length > 0) {
      await finalizeLessonLogDir(state.logDir.trim(), lessonId)
    }
    await deps.updateRun({
      runId: state.runId,
      userId: state.userId,
      status: 'completed',
      phase: 'completed',
      lessonId,
    })
    await logNode(state.runId, 'publish', {
      emoji: '✅',
      title: 'Узел publish: тест сохранён',
      detail: `lessonId: ${lessonId} (${formatDurationMs(Date.now() - started)})`,
    })
    return { lessonId, phase: 'completed' }
  })

  graph.addNode('fail_end', async (state: LessonGenerationState) => {
    const detail = state.errorMessage.trim() || state.relevanceUserMessage.trim()
    await logNode(state.runId, 'fail_end', {
      emoji: '⛔',
      title: 'Узел fail_end: генерация остановлена',
      ...(detail.length > 0 ? { detail } : {}),
    })
    await deps.updateRun({
      runId: state.runId,
      userId: state.userId,
      status: 'failed',
      phase: 'failed',
      errorCode: state.errorCode.trim() || 'MATERIAL_NOT_RELEVANT',
      errorMessage: detail,
    })
    return { phase: 'failed' }
  })

  wire.addEdge(START, 'ingest')
  wire.addEdge('ingest', 'classify_pipeline')
  wire.addConditionalEdges('classify_pipeline', routeAfterClassify, {
    relevance_raw: 'relevance_raw',
    relevance_ready: 'relevance_ready',
    fail_end: 'fail_end',
  })
  wire.addConditionalEdges('relevance_raw', routeAfterRelevanceRaw, {
    plan_draft: 'plan_draft',
    fail_end: 'fail_end',
  })
  wire.addConditionalEdges('plan_draft', routeAfterPlanDraft, {
    plan_hitl: 'plan_hitl',
    fail_end: 'fail_end',
  })
  wire.addEdge('plan_hitl', 'relevance_ready')
  wire.addConditionalEdges('relevance_ready', routeAfterRelevanceReady, {
    split_parts: 'split_parts',
    fail_end: 'fail_end',
  })
  wire.addEdge('split_parts', 'exercise_format_plan')
  wire.addEdge('exercise_format_plan', 'answers_collect')
  wire.addEdge('answers_collect', 'build_spec')
  wire.addConditionalEdges('build_spec', routeAfterBuildSpec, {
    maybe_auto_solve: 'maybe_auto_solve',
    fail_end: 'fail_end',
  })
  wire.addConditionalEdges('maybe_auto_solve', routeAfterMaybeAutoSolve, {
    auto_solve: 'auto_solve',
    html_build: 'html_build',
  })
  wire.addEdge('auto_solve', 'html_build')
  wire.addConditionalEdges('html_build', routeAfterHtmlBuild, {
    publish: 'publish',
    fail_end: 'fail_end',
  })
  wire.addEdge('publish', END)
  wire.addEdge('fail_end', END)

  return graph.compile({ checkpointer: deps.checkpointer })
}
