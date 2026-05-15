/**
 * Выбор поставщика LLM: Polza.ai (OpenAI-совместимый) или GigaChat.
 *
 * Переключение:
 * - Явно: `LLM_PROVIDER=polza` или `LLM_PROVIDER=gigachat`
 * - Если `LLM_PROVIDER` не задан: при наличии `POLZA_AI_API_KEY` / `POLZA_API_KEY` — Polza, иначе GigaChat.
 * - Чтобы при сохранённом ключе Polza всё равно использовать GigaChat: `LLM_PROVIDER=gigachat`.
 */
export type LlmProviderId = 'gigachat' | 'polza'

function normalizeProvider(raw: string | undefined): LlmProviderId | undefined {
  if (!raw?.trim()) return undefined
  const value = raw.trim().toLowerCase()
  if (value === 'polza' || value === 'polza.ai') return 'polza'
  if (value === 'gigachat' || value === 'giga') return 'gigachat'
  throw new Error(
    `LLM_PROVIDER="${raw.trim()}" is invalid. Use "polza" or "gigachat" (or omit for auto: Polza when API key is set).`,
  )
}

export function getLlmProvider(): LlmProviderId {
  const explicit = normalizeProvider(process.env.LLM_PROVIDER)
  if (explicit) return explicit

  const polzaKey =
    process.env.POLZA_AI_API_KEY?.trim() || process.env.POLZA_API_KEY?.trim()
  if (polzaKey) return 'polza'
  return 'gigachat'
}
