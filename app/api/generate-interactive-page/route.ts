import { describeImageMaterialForLesson } from '@/lib/agents/image-material-description'
import { LessonGenerationBlockedError } from '@/lib/agents/lesson-generation-blocked-error'
import { createClient } from '@/lib/supabase/server'
import { isAuthDisabled, resolveActingUserId } from '@/lib/auth/auth-disabled'
import { extractPdfAsMarkdown } from '@/lib/pdf/extract-pdf-text'
import {
  createPendingLessonLogDir,
  finalizeLessonLogDir,
  writeLessonFlowErrorLog,
} from '@/lib/gigachat/model-request-log'
import { generateInteractiveChatBodySchema } from '@/lib/lesson-meta'
import { generateInteractiveHtmlLesson } from '@/lib/lessons/generate-interactive-html'
import { inferLessonTitleFromChat } from '@/lib/lessons/infer-lesson-title-from-chat'
import { saveLessonRow } from '@/lib/lessons/save-lesson'
import { NextResponse } from 'next/server'
import { LABELS } from '@/lib/consts'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  let lessonLogDir: string | null = null
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

    const ensureLessonLogDir = async (): Promise<string | undefined> => {
      if (lessonLogDir !== null) return lessonLogDir
      const dir = await createPendingLessonLogDir()
      if (dir === null) return undefined
      lessonLogDir = dir
      return lessonLogDir
    }

    const contentType = request.headers.get('content-type') ?? ''

    let title: string
    let sourceType: 'pdf' | 'image' | 'chat'
    let sourceFilename: string | null
    let materialSummary: string
    let correctAnswersHint: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: LABELS.API_GENERATE_NO_FILE }, { status: 400 })
      }
      title = (formData.get('title') as string)?.trim() || file.name.replace(/\.[^.]+$/, '') || LABELS.DEFAULT_LESSON_TITLE
      sourceFilename = file.name
      const hintField = formData.get('correctAnswersHint')
      if (typeof hintField === 'string') {
        const t = hintField.trim()
        if (t.length > 0) correctAnswersHint = t.slice(0, 16_000)
      }

      const buf = await file.arrayBuffer()
      if (file.type === 'application/pdf') {
        sourceType = 'pdf'
        materialSummary = await extractPdfAsMarkdown(buf)
        if (!materialSummary.trim()) {
          return NextResponse.json({ error: LABELS.API_GENERATE_PDF_EXTRACT_FAILED }, { status: 400 })
        }
      } else if (file.type.startsWith('image/')) {
        sourceType = 'image'
        materialSummary = await describeImageMaterialForLesson({
          arrayBuffer: buf,
          mimeType: file.type,
          fileName: file.name,
        })
      } else {
        return NextResponse.json({ error: LABELS.API_GENERATE_UNSUPPORTED_FILE }, { status: 400 })
      }
    } else {
      const json: unknown = await request.json()
      const parsed = generateInteractiveChatBodySchema.safeParse(json)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid JSON', details: parsed.error.flatten() }, { status: 400 })
      }
      sourceType = 'chat'
      sourceFilename = null
      const explicitTitle = parsed.data.title?.trim()
      title = explicitTitle
        ? explicitTitle
        : await inferLessonTitleFromChat(parsed.data.messages, {
            logDir: await ensureLessonLogDir(),
          })
      materialSummary = parsed.data.messages.map((m) => `${m.role}: ${m.content}`).join('\n\n')
      const h = parsed.data.correctAnswersHint?.trim()
      if (h && h.length > 0) correctAnswersHint = h.slice(0, 16_000)
    }

    const { html, validationWarnings, spec } = await generateInteractiveHtmlLesson({
      title,
      materialSummary,
      ...(correctAnswersHint ? { correctAnswersHint } : {}),
      logDir: await ensureLessonLogDir(),
    })
    const specRecord = spec as unknown as Record<string, unknown>
    const lessonId = await saveLessonRow(supabase, actingUserId, {
      title,
      sourceType,
      sourceFilename,
      htmlBody: html,
      specJson: specRecord,
      meta: {
        generatedAt: new Date().toISOString(),
        lessonEngine: 'spec-v1',
        ...(validationWarnings.length > 0 ? { validationWarnings } : {}),
        ...(validationWarnings.length > 0 && (sourceType === 'pdf' || sourceType === 'image')
          ? { partialSourceIngest: true }
          : {}),
      },
    })

    if (lessonLogDir) {
      await finalizeLessonLogDir(lessonLogDir, lessonId)
    }

    return NextResponse.json({
      success: true,
      lessonId,
      viewUrl: `/learn/${lessonId}/view`,
      documentUrl: `/learn/${lessonId}/document`,
      validationWarnings,
    })
  } catch (error) {
    if (error instanceof LessonGenerationBlockedError) {
      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status: 422 },
      )
    }
    const msg = error instanceof Error ? error.message : 'Server error'
    console.error('[generate-interactive-page]', error)
    if (lessonLogDir) {
      await writeLessonFlowErrorLog(lessonLogDir, error)
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
