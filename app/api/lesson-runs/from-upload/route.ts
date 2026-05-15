import { randomUUID } from 'node:crypto'

import { createClient } from '@/lib/supabase/server'
import { isAuthDisabled, resolveActingUserId } from '@/lib/auth/auth-disabled'
import { fileToMaterialText } from '@/lib/lesson-runs/file-to-material-text'
import { createPendingLessonLogDir } from '@/lib/gigachat/model-request-log'
import {
  appendLessonGenerationEvent,
  insertLessonGenerationRun,
} from '@/lib/lesson-generation/supabase-runs'
import { lessonSourceTypeFromUploadFiles } from '@/lib/lesson-generation/lesson-ingest-source-type'
import { invokeLessonGenerationGraph } from '@/lib/lesson-generation/run-executor'
import { isTerminalLessonGenerationFailure } from '@/lib/lesson-generation/lesson-run-failure'
import { lessonRunsTableMissingHint } from '@/lib/lesson-generation/lesson-runs-db-error'
import { LABELS } from '@/lib/consts'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!isAuthDisabled() && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const actingUserId = resolveActingUserId(user)
    if (actingUserId === undefined) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const titleField = formData.get('title')
    const title =
      typeof titleField === 'string' && titleField.trim().length > 0
        ? titleField.trim().slice(0, 500)
        : LABELS.DEFAULT_LESSON_TITLE

    const materialEntries = formData.getAll('materialFiles')
    const materialFiles: File[] = []
    const materialPieces: string[] = []
    for (const entry of materialEntries) {
      if (entry instanceof File && entry.size > 0) {
        materialFiles.push(entry)
        materialPieces.push(await fileToMaterialText(entry))
      }
    }
    const lessonSourceType = lessonSourceTypeFromUploadFiles(materialFiles)
    const userMaterialText = materialPieces.filter((chunk) => chunk.trim().length > 0).join('\n\n---\n\n')

    const hintField = formData.get('correctAnswersHint')
    const correctAnswersHint =
      typeof hintField === 'string' && hintField.trim().length > 0 ? hintField.trim().slice(0, 16_000) : ''

    const autoSolveField = formData.get('autoSolveRequested')
    const autoSolveRequested =
      autoSolveField === '1' || autoSolveField === 'true' || autoSolveField === 'on'

    if (!userMaterialText.trim()) {
      return NextResponse.json({ error: LABELS.API_GENERATE_NO_FILE }, { status: 400 })
    }

    const runId = randomUUID()
    const threadId = runId

    await insertLessonGenerationRun(supabase, {
      runId,
      userId: actingUserId,
      threadId,
      mode: 'ready_material',
      title,
      payload: { version: 2, source: 'upload', modeProvisional: true },
    })

    await appendLessonGenerationEvent(supabase, {
      runId,
      emoji: '▶️',
      title: 'Сессия из файлов',
      detail: title,
    })

    const logDir = (await createPendingLessonLogDir()) ?? ''

    const result = await invokeLessonGenerationGraph({
      supabase,
      userId: actingUserId,
      runId,
      threadId,
      initialState: {
        mode: 'ready_material',
        title,
        userMaterialText,
        chatUserText: '',
        correctAnswersHint,
        ...(autoSolveRequested ? { autoSolveRequested: true } : {}),
        logDir,
        lessonSourceType,
      },
    })

    if (isTerminalLessonGenerationFailure(result.state)) {
      const message =
        result.state.errorMessage.trim() ||
        result.state.relevanceUserMessage.trim() ||
        'Генерация остановлена'
      return NextResponse.json(
        {
          success: false,
          runId,
          threadId,
          phase: result.state.phase,
          error: message,
        },
        { status: 422 },
      )
    }

    return NextResponse.json({
      success: true,
      runId,
      threadId,
      interrupted: result.interrupted,
      interrupt: result.interrupted ? result.interruptPayload : undefined,
      lessonId: result.state.lessonId ?? undefined,
      phase: result.state.phase,
      validationWarnings: result.state.validationWarnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    const hint = lessonRunsTableMissingHint(error)
    console.error('[lesson-runs/from-upload]', error)
    return NextResponse.json({ error: message, ...(hint ? { hint } : {}) }, { status: 500 })
  }
}
