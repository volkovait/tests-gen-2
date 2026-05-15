import { Command } from '@langchain/langgraph'
import type { SupabaseClient } from '@supabase/supabase-js'

import { saveLessonRow } from '@/lib/lessons/save-lesson'

import { buildLessonGenerationGraph } from './graph'
import { getLessonGenerationCheckpointer } from './checkpointer'
import { appendGenerationRunStepFile } from './generation-run-file-log'
import { appendLessonGenerationEvent, updateLessonGenerationRun } from './supabase-runs'
import type { LessonGenerationState } from './state'

function buildInitialState(input: {
  userId: string
  runId: string
  threadId: string
  initial: Partial<LessonGenerationState>
}): LessonGenerationState {
  return {
    userId: input.userId,
    runId: input.runId,
    threadId: input.threadId,
    mode: input.initial.mode ?? 'ready_material',
    title: input.initial.title ?? 'Тест',
    userMaterialText: input.initial.userMaterialText ?? '',
    chatUserText: input.initial.chatUserText ?? '',
    correctAnswersHint: input.initial.correctAnswersHint ?? '',
    materialRelevant: input.initial.materialRelevant ?? true,
    relevanceUserMessage: input.initial.relevanceUserMessage ?? '',
    planDraft: input.initial.planDraft ?? '',
    planApprovedBody: input.initial.planApprovedBody ?? '',
    logicalParts: input.initial.logicalParts ?? [],
    taskTypeIntentJson: input.initial.taskTypeIntentJson ?? '',
    partExercisePlanJson: input.initial.partExercisePlanJson ?? '',
    combinedMaterial: input.initial.combinedMaterial ?? '',
    lessonSpecJson: input.initial.lessonSpecJson ?? null,
    validationWarnings: input.initial.validationWarnings ?? [],
    htmlBody: input.initial.htmlBody ?? null,
    lessonId: input.initial.lessonId ?? null,
    phase: input.initial.phase ?? 'init',
    errorCode: input.initial.errorCode ?? '',
    errorMessage: input.initial.errorMessage ?? '',
    autoSolveRequested: input.initial.autoSolveRequested ?? false,
    autoSolveDisclaimer: input.initial.autoSolveDisclaimer ?? '',
    buildSpecAttempts: input.initial.buildSpecAttempts ?? 0,
    logDir: input.initial.logDir ?? '',
    lessonSourceType: input.initial.lessonSourceType ?? 'chat',
  }
}

export async function invokeLessonGenerationGraph(input: {
  supabase: SupabaseClient
  userId: string
  runId: string
  threadId: string
  initialState?: Partial<LessonGenerationState>
  command?: Command
}): Promise<{
  state: LessonGenerationState
  interrupted: boolean
  interruptPayload: unknown
}> {
  const checkpointer = await getLessonGenerationCheckpointer()
  const graph = buildLessonGenerationGraph({
    checkpointer,
    appendEvent: async (payload) => {
      await appendLessonGenerationEvent(input.supabase, {
        runId: payload.runId,
        emoji: payload.emoji,
        title: payload.title,
        detail: payload.detail,
        nodeId: payload.nodeId,
      })
      await appendGenerationRunStepFile({
        runId: payload.runId,
        emoji: payload.emoji,
        title: payload.title,
        detail: payload.detail,
      })
    },
    saveLesson: async (payload) => {
      const specRecord = payload.spec as unknown as Record<string, unknown>
      return saveLessonRow(input.supabase, input.userId, {
        title: payload.title,
        sourceType: payload.sourceType,
        sourceFilename: payload.sourceFilename,
        htmlBody: payload.htmlBody,
        meta: payload.meta,
        specJson: specRecord,
        generationRunId: payload.generationRunId,
      })
    },
    updateRun: async (payload) => {
      await updateLessonGenerationRun(input.supabase, {
        runId: payload.runId,
        userId: input.userId,
        status: payload.status,
        phase: payload.phase,
        mode: payload.mode,
        lessonId: payload.lessonId,
        errorCode: payload.errorCode,
        errorMessage: payload.errorMessage,
        payloadPatch: payload.payloadPatch,
      })
    },
  })

  const config = { configurable: { thread_id: input.threadId } as const, recursionLimit: 80 }

  const payload = input.command
    ? await graph.invoke(input.command as never, config)
    : await graph.invoke(
        buildInitialState({
          userId: input.userId,
          runId: input.runId,
          threadId: input.threadId,
          initial: input.initialState ?? {},
        }),
        config,
      )

  const raw = payload as LessonGenerationState & {
    __interrupt__?: Array<{ value: unknown }>
  }
  const interrupted = Array.isArray(raw.__interrupt__) && raw.__interrupt__.length > 0
  const interruptPayload = interrupted ? raw.__interrupt__![0].value : undefined
  const { __interrupt__: _ignored, ...rest } = raw
  const state = rest as LessonGenerationState

  if (interrupted) {
    await updateLessonGenerationRun(input.supabase, {
      runId: input.runId,
      userId: input.userId,
      status: 'interrupted',
      phase: 'awaiting_resume',
    })
  }

  return {
    state,
    interrupted,
    interruptPayload,
  }
}

export type { LessonGenerationState }
