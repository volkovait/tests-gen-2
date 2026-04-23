import type { LessonSpecFromModel } from '@/lib/lesson-spec/schema'
import { stripHtmlTags } from '@/lib/lesson-spec/sanitize-lesson-text'

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

function safeStrip(s: string): string {
  const t = stripHtmlTags(s)
  return t.length > 0 ? t : '—'
}

/** Убирает ведущий «A) » / «b)» из текста варианта, если модель продублировала букву. */
function stripLeadingOptionLabel(text: string): string {
  const t = text.replace(/^[A-Za-z]\)\s*/, '').trim()
  return t.length > 0 ? t : text
}

/**
 * Переназначает ключи вариантов на A, B, C, … и обновляет correctKey (после stripHtml на text).
 */
function normalizeMcqQuestion(q: {
  prompt: string
  options?: Array<{ key: string; text: string }>
  correctKey?: string
  wordBank?: string[]
  correctSentence?: string
}): void {
  q.prompt = safeStrip(q.prompt)
  if (q.wordBank) {
    q.wordBank = q.wordBank.map((w) => safeStrip(w))
  }
  if (q.correctSentence) {
    q.correctSentence = safeStrip(q.correctSentence)
  }
  const opts = q.options
  if (!opts?.length) return

  const stripped = opts.map((o) => ({
    oldKey: String(o.key).trim(),
    text: stripLeadingOptionLabel(safeStrip(o.text)),
  }))
  const oldCorrect = q.correctKey?.trim()

  q.options = stripped.map((row, i) => ({
    key: optionLetter(i),
    text: row.text,
  }))

  if (!oldCorrect) return

  const lower = oldCorrect.toLowerCase()
  let byKeyExact = -1
  let byKeyCi = -1
  let byTextCi = -1
  for (let i = 0; i < stripped.length; i += 1) {
    const row = stripped[i]
    if (byKeyExact < 0 && row.oldKey === oldCorrect) byKeyExact = i
    if (byKeyCi < 0 && row.oldKey.toLowerCase() === lower) byKeyCi = i
    if (byTextCi < 0 && row.text.toLowerCase() === lower) byTextCi = i
  }
  const idx = byKeyExact >= 0 ? byKeyExact : byKeyCi >= 0 ? byKeyCi : byTextCi
  if (idx >= 0) {
    q.correctKey = optionLetter(idx)
  }
}

/** Рекурсивно чистит строки и нормализует MCQ/select ключи. */
export function normalizeLessonSpecFromModel(spec: LessonSpecFromModel): LessonSpecFromModel {
  const out = structuredClone(spec) as LessonSpecFromModel
  out.title = safeStrip(out.title)
  if (out.subtitle) {
    out.subtitle = safeStrip(out.subtitle)
  }
  for (const part of out.parts) {
    part.title = safeStrip(part.title)
    for (const ex of part.exercises) {
      ex.title = safeStrip(ex.title)
      if (ex.instruction) ex.instruction = safeStrip(ex.instruction)
      if (ex.readingPassage) {
        const rp = ex.readingPassage
        if (rp.title) rp.title = safeStrip(rp.title)
        if (rp.instruction) rp.instruction = safeStrip(rp.instruction)
        rp.paragraphs = rp.paragraphs.map((p) => safeStrip(p))
      }
      const kind = ex.inputKind ?? 'radio'
      if (kind === 'radio' || kind === 'select') {
        for (const q of ex.questions) {
          normalizeMcqQuestion(q)
        }
      } else {
        for (const q of ex.questions) {
          q.prompt = safeStrip(q.prompt)
          if (q.wordBank) q.wordBank = q.wordBank.map((w) => safeStrip(w))
          if (q.correctSentence) q.correctSentence = safeStrip(q.correctSentence)
        }
      }
    }
  }
  return out
}
