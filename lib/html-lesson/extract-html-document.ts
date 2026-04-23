const MAX_HTML_BYTES = 900_000

/**
 * Strips optional markdown fence and ensures we keep a single HTML document string.
 */
export function extractHtmlDocument(raw: string): string {
  let s = raw.trim()
  const fence = /^```(?:html)?\s*\n?([\s\S]*?)\n?```\s*$/i.exec(s)
  if (fence?.[1]) {
    s = fence[1].trim()
  }
  if (!/<html[\s>]/i.test(s) && /<body[\s>]/i.test(s)) {
    s = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>тест</title></head>${s}</html>`
  }
  const enc = new TextEncoder().encode(s)
  if (enc.length > MAX_HTML_BYTES) {
    throw new Error('Сгенерированный HTML слишком большой')
  }
  return s
}
