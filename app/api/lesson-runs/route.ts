import { randomUUID } from 'node:crypto'

import { createClient } from '@/lib/supabase/server'
import {
  appendLessonGenerationEvent,
  insertLessonGenerationRun,
} from '@/lib/lesson-generation/supabase-runs'
import { invokeLessonGenerationGraph } from '@/lib/lesson-generation/run-executor'
import { isTerminalLessonGenerationFailure } from '@/lib/lesson-generation/lesson-run-failure'
import { lessonRunsTableMissingHint } from '@/lib/lesson-generation/lesson-runs-db-error'
import { createPendingLessonLogDir } from '@/lib/gigachat/model-request-log'
import { lessonRunStartBodySchema } from '@/lib/lesson-meta'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

function chatMessagesToText(
  messages: Array<{ role: 'user' | 'assistant'; content: string }> | undefined,
): string {
  if (!messages?.length) return ''
  return messages.map((message) => `${message.role}: ${message.content}`).join('\n\n')
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json: unknown = await request.json()
    const parsed = lessonRunStartBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid JSON', details: parsed.error.flatten() }, { status: 400 })
    }

    const body = parsed.data
    const runId = randomUUID()
    const threadId = runId

    await insertLessonGenerationRun(supabase, {
      runId,
      userId: user.id,
      threadId,
      mode: 'ready_material',
      title: body.title?.trim() || null,
      payload: { version: 2, modeProvisional: true },
    })

    await appendLessonGenerationEvent(supabase, {
      runId,
      emoji: '▶️',
      title: 'Сессия генерации',
      detail: 'Тип материала определит модель на следующем шаге',
    })

    const logDir = (await createPendingLessonLogDir()) ?? ''

    const chatUserText = chatMessagesToText(body.messages)

    const result = await invokeLessonGenerationGraph({
      supabase,
      userId: user.id,
      runId,
      threadId,
      initialState: {
        mode: 'ready_material',
        title: body.title?.trim() || 'Тест',
        userMaterialText: body.materialText?.trim() ?? '',
        chatUserText,
        correctAnswersHint: body.correctAnswersHint?.trim() ?? '',
        ...(body.autoSolveRequested === true ? { autoSolveRequested: true } : {}),
        logDir,
        lessonSourceType: 'chat',
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
    console.error('[lesson-runs POST]', error)
    return NextResponse.json({ error: message, ...(hint ? { hint } : {}) }, { status: 500 })
  }
}
