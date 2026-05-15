import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const REL_ROOT = join('logs', 'lesson-model-requests')

/** UTC дата-время до секунды для имён папок/файлов логов (без `:` — удобно для ФС). */
export function formatLogFileTimestamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-')
}

/** Уникальная подпапка: `{prefix}-{YYYY-MM-DD_HH-mm-ss}`; при `EEXIST` — суффикс `_2`, `_3`, … */
export async function mkdirUniqueTimestampedDir(root: string, prefix: string): Promise<string> {
  await mkdir(root, { recursive: true })
  const stamp = formatLogFileTimestamp()
  const base = `${prefix}-${stamp}`
  for (let attempt = 0; attempt < 1000; attempt++) {
    const name = attempt === 0 ? base : `${base}_${attempt + 1}`
    const dir = join(root, name)
    try {
      await mkdir(dir)
      return dir
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      if (code === 'EEXIST') continue
      throw error
    }
  }
  throw new Error(`Could not create unique log directory under ${root}`)
}

/** В проде ФС часто только для чтения (Vercel, Docker) — не пишем в `logs/`. */
export function isLessonModelFileLogEnabled(): boolean {
  if (process.env.LESSON_MODEL_FILE_LOG === '1' || process.env.LESSON_MODEL_FILE_LOG === 'true') {
    return true
  }
  return process.env.NODE_ENV !== 'production'
}

export function lessonModelLogRoot(): string {
  return join(process.cwd(), REL_ROOT)
}

/** Папка для одной сессии генерации теста (до появления `lessonId` — имя `pending-` + дата_время до секунды). */
export async function createPendingLessonLogDir(): Promise<string | null> {
  if (!isLessonModelFileLogEnabled()) return null
  return mkdirUniqueTimestampedDir(lessonModelLogRoot(), 'pending')
}

/** После сохранения теста переименовываем папку в id теста. */
export async function finalizeLessonLogDir(pendingDir: string, lessonId: string): Promise<void> {
  if (!pendingDir || !isLessonModelFileLogEnabled()) return
  const target = join(lessonModelLogRoot(), lessonId)
  try {
    await rename(pendingDir, target)
  } catch {
    await rename(pendingDir, `${target}-${Date.now()}`)
  }
}

/** Одна папка на запрос ассистента чата (без привязки к тесту в БД). */
export async function createAssistantRequestLogDir(): Promise<string | null> {
  if (!isLessonModelFileLogEnabled()) return null
  return mkdirUniqueTimestampedDir(lessonModelLogRoot(), 'assistant')
}

const MAX_RESPONSE_CHARS = 2_000_000

export type ModelCallLogPayload = {
  url: string
  httpStatus?: number
  requestPayload: unknown
  rawResponseBody?: string
  fetchError?: string
}

export async function writeModelCallLogFile(
  outputDir: string,
  fileBase: string,
  payload: ModelCallLogPayload,
): Promise<void> {
  if (!isLessonModelFileLogEnabled() || !outputDir) return
  await mkdir(outputDir, { recursive: true })
  const responseSnippet =
    payload.rawResponseBody !== undefined
      ? payload.rawResponseBody.length > MAX_RESPONSE_CHARS
        ? `${payload.rawResponseBody.slice(0, MAX_RESPONSE_CHARS)}\n\n… [truncated]`
        : payload.rawResponseBody
      : undefined

  const parts = [
    `timestamp: ${new Date().toISOString()}`,
    `url: ${payload.url}`,
    payload.httpStatus !== undefined ? `http_status: ${payload.httpStatus}` : null,
    '',
    '--- request JSON ---',
    JSON.stringify(payload.requestPayload, null, 2),
    '',
    '--- response / error ---',
    payload.fetchError !== undefined
      ? payload.fetchError
      : responseSnippet !== undefined
        ? responseSnippet
        : '(no body)',
    '',
  ]

  const stamp = formatLogFileTimestamp()
  await writeFile(join(outputDir, `${fileBase}-${stamp}.txt`), parts.filter((x) => x !== null).join('\n'), 'utf8')
}

/** Ошибка пайплайна генерации (после логов вызовов модели или вместо них). */
export async function writeLessonFlowErrorLog(logDir: string, reason: unknown): Promise<void> {
  if (!isLessonModelFileLogEnabled() || !logDir) return
  const msg =
    reason instanceof Error ? `${reason.message}\n${reason.stack ?? ''}`.trim() : String(reason)
  try {
    await mkdir(logDir, { recursive: true })
    await writeFile(join(logDir, `flow-error-${formatLogFileTimestamp()}.txt`), msg, 'utf8')
  } catch {
    // ignore secondary failures
  }
}
