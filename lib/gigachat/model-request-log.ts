import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const REL_ROOT = join('logs', 'lesson-model-requests')

/** В проде ФС часто только для чтения (Vercel, Docker) — не пишем в `logs/`. */
export function isLessonModelFileLogEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function lessonModelLogRoot(): string {
  return join(process.cwd(), REL_ROOT)
}

/** Папка для одной сессии генерации теста (до появления `lessonId` — префикс `pending-`). */
export async function createPendingLessonLogDir(): Promise<string | null> {
  if (!isLessonModelFileLogEnabled()) return null
  const dir = join(lessonModelLogRoot(), `pending-${randomUUID()}`)
  await mkdir(dir, { recursive: true })
  return dir
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
  const dir = join(lessonModelLogRoot(), `assistant-${randomUUID()}`)
  await mkdir(dir, { recursive: true })
  return dir
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

  await writeFile(join(outputDir, `${fileBase}.txt`), parts.filter((x) => x !== null).join('\n'), 'utf8')
}

/** Ошибка пайплайна генерации (после логов вызовов модели или вместо них). */
export async function writeLessonFlowErrorLog(logDir: string, reason: unknown): Promise<void> {
  if (!isLessonModelFileLogEnabled() || !logDir) return
  const msg =
    reason instanceof Error ? `${reason.message}\n${reason.stack ?? ''}`.trim() : String(reason)
  try {
    await mkdir(logDir, { recursive: true })
    await writeFile(join(logDir, 'flow-error.txt'), msg, 'utf8')
  } catch {
    // ignore secondary failures
  }
}
