import { appendFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  formatLogFileTimestamp,
  isLessonModelFileLogEnabled,
  mkdirUniqueTimestampedDir,
} from '@/lib/gigachat/model-request-log'

const REL = join('logs', 'lesson-generation')

/** Каталог лога прогона: не `runId` (часто UUID), а `run-` + дата_время до секунды. */
const runLogDirByRunId = new Map<string, string>()

/** Одно имя файла шагов на `runId` (первый append фиксирует метку секунды). */
const stepsLogFileNameByRunId = new Map<string, string>()

export async function appendGenerationRunStepFile(params: {
  runId: string
  emoji: string
  title: string
  detail?: string
}): Promise<void> {
  if (!isLessonModelFileLogEnabled()) return
  const lessonGenRoot = join(process.cwd(), REL)
  let runDir = runLogDirByRunId.get(params.runId)
  if (runDir === undefined) {
    runDir = await mkdirUniqueTimestampedDir(lessonGenRoot, 'run')
    runLogDirByRunId.set(params.runId, runDir)
  }
  let stepsFileName = stepsLogFileNameByRunId.get(params.runId)
  if (stepsFileName === undefined) {
    stepsFileName = `steps-${formatLogFileTimestamp()}.log`
    stepsLogFileNameByRunId.set(params.runId, stepsFileName)
  }
  const line = `${new Date().toISOString()}\t${params.emoji}\t${params.title}${params.detail ? `\t${params.detail.replace(/\n/g, ' ')}` : ''}\n`
  await appendFile(join(runDir, stepsFileName), line, 'utf8')
}
