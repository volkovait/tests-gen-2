import { buildLessonHtmlFromSpec } from '@/lib/html-lesson/build-lesson-html'
import { generateValidatedLessonSpec } from '@/lib/lesson-spec/generate-lesson-spec'
import { lessonSpecSchema, type LessonSpec } from '@/lib/lesson-spec/schema'
import { stripHtmlTags } from '@/lib/lesson-spec/sanitize-lesson-text'

const MAX_HTML_BYTES = 900_000
const MAX_LESSON_TITLE_LEN = 500

function canonicalLessonTitle(requested: string, modelTitle: string): string {
  const fromRequest = stripHtmlTags(requested).trim()
  if (fromRequest.length > 0) {
    return fromRequest.length > MAX_LESSON_TITLE_LEN
      ? fromRequest.slice(0, MAX_LESSON_TITLE_LEN)
      : fromRequest
  }
  const fromModel = stripHtmlTags(modelTitle).trim()
  return fromModel.length > 0 ? fromModel : '—'
}

export async function generateInteractiveHtmlLesson(params: {
  title: string
  materialSummary: string
  /** Необязательные эталонные ответы в свободной форме (из UI или формы). */
  correctAnswersHint?: string
  /** Логи вызова модели: `generate-spec.txt` в этой папке. */
  logDir?: string
}): Promise<{ html: string; validationWarnings: string[] }> {
  const { spec, validationWarnings } = await generateValidatedLessonSpec({
    title: params.title,
    materialSummary: params.materialSummary,
    ...(params.correctAnswersHint?.trim()
      ? { correctAnswersHint: params.correctAnswersHint.trim() }
      : {}),
    logDir: params.logDir,
  })
  const title = canonicalLessonTitle(params.title, spec.title)
  const specWithTitle: LessonSpec = lessonSpecSchema.parse({ ...spec, title })
  const html = buildLessonHtmlFromSpec(specWithTitle)
  const enc = new TextEncoder().encode(html)
  if (enc.length > MAX_HTML_BYTES) {
    throw new Error('Сгенерированный HTML слишком большой')
  }
  return { html, validationWarnings }
}
