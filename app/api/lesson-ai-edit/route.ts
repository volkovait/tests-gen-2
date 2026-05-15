import {
  createPendingLessonLogDir,
  finalizeLessonLogDir,
  writeLessonFlowErrorLog,
} from '@/lib/gigachat/model-request-log'
import { generateInteractiveHtmlLessonFromEdit } from '@/lib/lessons/generate-interactive-html'
import { stripHtmlTags } from '@/lib/lesson-spec/sanitize-lesson-text'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 300

const bodySchema = z.object({
  lessonId: z.string().uuid(),
  instruction: z.string().min(1).max(8000),
})

export async function POST(request: Request) {
  let lessonLogDir: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ensureLessonLogDir = async (): Promise<string | undefined> => {
      if (lessonLogDir !== null) return lessonLogDir
      const dir = await createPendingLessonLogDir()
      if (dir === null) return undefined
      lessonLogDir = dir
      return lessonLogDir
    }

    const json: unknown = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid JSON', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('id, title, html_body, meta, source_type')
      .eq('id', parsed.data.lessonId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !lesson?.html_body || typeof lesson.title !== 'string') {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const plain = stripHtmlTags(lesson.html_body)
    const { html, validationWarnings, resolvedTitle } = await generateInteractiveHtmlLessonFromEdit({
      title: lesson.title,
      currentTestPlainText: plain,
      editInstruction: parsed.data.instruction,
      logDir: await ensureLessonLogDir(),
    })

    const prevMeta =
      lesson.meta && typeof lesson.meta === 'object' && !Array.isArray(lesson.meta)
        ? (lesson.meta as Record<string, unknown>)
        : {}

    const sourceType = lesson.source_type
    const partialFileSource =
      sourceType === 'pdf' || sourceType === 'image' ? (sourceType as 'pdf' | 'image') : null

    const { error: upErr } = await supabase
      .from('lessons')
      .update({
        html_body: html,
        title: resolvedTitle,
        updated_at: new Date().toISOString(),
        meta: {
          ...prevMeta,
          lastAiEditAt: new Date().toISOString(),
          ...(validationWarnings.length > 0 ? { validationWarnings } : {}),
          ...(validationWarnings.length > 0 && partialFileSource !== null ? { partialSourceIngest: true } : {}),
        },
      })
      .eq('id', parsed.data.lessonId)
      .eq('user_id', user.id)

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    if (lessonLogDir) {
      await finalizeLessonLogDir(lessonLogDir, parsed.data.lessonId)
    }

    return NextResponse.json({
      success: true,
      title: resolvedTitle,
      validationWarnings,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    console.error('[lesson-ai-edit]', e)
    if (lessonLogDir) {
      await writeLessonFlowErrorLog(lessonLogDir, e)
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
