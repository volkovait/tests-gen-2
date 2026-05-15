import { Command } from '@langchain/langgraph'

import { createClient } from '@/lib/supabase/server'
import { isAuthDisabled } from '@/lib/auth/auth-disabled'
import { invokeLessonGenerationGraph } from '@/lib/lesson-generation/run-executor'
import { isTerminalLessonGenerationFailure } from '@/lib/lesson-generation/lesson-run-failure'
import { lessonRunsTableMissingHint } from '@/lib/lesson-generation/lesson-runs-db-error'
import { fetchLessonGenerationRun, updateLessonGenerationRun } from '@/lib/lesson-generation/supabase-runs'
import { lessonRunResumeBodySchema } from '@/lib/lesson-meta'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request, routeContext: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!isAuthDisabled() && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: runId } = await routeContext.params
    const fetchUserId = user !== null ? user.id : null
    const run = await fetchLessonGenerationRun(supabase, { runId, userId: fetchUserId })
    if (!run) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const graphUserId = user?.id ?? run.user_id

    const json: unknown = await request.json()
    const parsed = lessonRunResumeBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid JSON', details: parsed.error.flatten() }, { status: 400 })
    }

    await updateLessonGenerationRun(supabase, {
      runId,
      userId: fetchUserId,
      status: 'running',
      phase: 'resumed',
    })

    const result = await invokeLessonGenerationGraph({
      supabase,
      userId: graphUserId,
      runId,
      threadId: run.thread_id,
      command: new Command({ resume: parsed.data.resume }),
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
          interrupted: result.interrupted,
          interrupt: result.interrupted ? result.interruptPayload : undefined,
          phase: result.state.phase,
          error: message,
        },
        { status: 422 },
      )
    }

    return NextResponse.json({
      success: true,
      runId,
      threadId: run.thread_id,
      interrupted: result.interrupted,
      interrupt: result.interrupted ? result.interruptPayload : undefined,
      lessonId: result.state.lessonId ?? undefined,
      phase: result.state.phase,
      validationWarnings: result.state.validationWarnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    const hint = lessonRunsTableMissingHint(error)
    console.error('[lesson-runs resume POST]', error)
    return NextResponse.json({ error: message, ...(hint ? { hint } : {}) }, { status: 500 })
  }
}
