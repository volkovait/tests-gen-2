const MAX_JSON_BYTES = 400_000

/**
 * Убирает markdown-ограждение ```json и проверяет размер.
 */
export function extractJsonDocument(raw: string): string {
  let s = raw.trim()
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i.exec(s)
  if (fence?.[1]) {
    s = fence[1].trim()
  }
  const enc = new TextEncoder().encode(s)
  if (enc.length > MAX_JSON_BYTES) {
    throw new Error('Сгенерированный JSON слишком большой')
  }
  return s
}
