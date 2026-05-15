function requiredPolzaKey(): string {
  const fromPrimary = process.env.POLZA_AI_API_KEY?.trim()
  if (fromPrimary) return fromPrimary
  const fromAlias = process.env.POLZA_API_KEY?.trim()
  if (fromAlias) return fromAlias
  throw new Error(
    'Polza is selected but no API key: set POLZA_AI_API_KEY (or POLZA_API_KEY). See https://polza.ai/docs/glavnoe/quickstart',
  )
}

export function getPolzaApiKey(): string {
  return requiredPolzaKey()
}

/** Базовый URL OpenAI-совместимого API (без завершающего `/`). */
export function getPolzaBaseUrl(): string {
  const raw = process.env.POLZA_BASE_URL?.trim() || 'https://polza.ai/api/v1'
  return raw.replace(/\/$/, '')
}

export function getPolzaChatCompletionsUrl(): string {
  return `${getPolzaBaseUrl()}/chat/completions`
}

/** Основная модель (агенты, простые вызовы). */
export function getPolzaModel(): string {
  return process.env.POLZA_MODEL?.trim() || 'openai/gpt-4o-mini'
}

export function getPolzaModelSpec(): string {
  const fromEnv = process.env.POLZA_MODEL_SPEC?.trim()
  if (fromEnv) return fromEnv
  return getPolzaModel()
}

export function getPolzaModelRepair(): string {
  const fromEnv = process.env.POLZA_MODEL_REPAIR?.trim()
  if (fromEnv) return fromEnv
  return getPolzaModelSpec()
}

export function getPolzaModelPlanner(): string {
  const fromEnv = process.env.POLZA_MODEL_PLANNER?.trim()
  if (fromEnv) return fromEnv
  return getPolzaModelSpec()
}

/**
 * Модель для описания изображений (vision). По умолчанию — флагман с vision;
 * при необходимости задайте `POLZA_MODEL_VISION`.
 */
export function getPolzaVisionModel(): string {
  const fromEnv = process.env.POLZA_MODEL_VISION?.trim()
  if (fromEnv) return fromEnv
  return 'openai/gpt-4o'
}
