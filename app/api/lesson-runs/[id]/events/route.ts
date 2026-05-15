import { createClient } from '@/lib/supabase/server'
import { lessonRunsTableMissingHint } from '@/lib/lesson-generation/lesson-runs-db-error'
import { fetchLessonGenerationRun, listLessonGenerationEvents } from '@/lib/lesson-generation/supabase-runs'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request, routeContext: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: runId } = await routeContext.params
    const run = await fetchLessonGenerationRun(supabase, { runId, userId: user.id })
    if (!run) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const afterSeqRaw = url.searchParams.get('afterSeq')
    const afterSeq =
      afterSeqRaw !== null && afterSeqRaw.length > 0 ? Number.parseInt(afterSeqRaw, 10) : undefined

    const events = await listLessonGenerationEvents(supabase, {
      runId,
      userId: user.id,
      ...(Number.isFinite(afterSeq) ? { afterSeq } : {}),
    })

    return NextResponse.json({
      run: {
        id: run.id,
        status: run.status,
        phase: run.phase,
        mode: run.mode,
        lessonId: run.lesson_id,
        errorCode: run.error_code,
        errorMessage: run.error_message,
        title: run.title,
      },
      events,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    const hint = lessonRunsTableMissingHint(error)
    console.error('[lesson-runs events GET]', error)
    return NextResponse.json({ error: message, ...(hint ? { hint } : {}) }, { status: 500 })
  }
}
