/**
 * Reads Supabase credentials from env. Supports both legacy anon key and
 * dashboard "publishable" key variable names.
 *
 * `NEXT_PUBLIC_*` подставляются Next.js в код при `next build`. В Docker
 * compose часто передаёт пустой `NEXT_PUBLIC_SUPABASE_ANON_KEY`, тогда в бандле
 * — строка `""`. Оператор `??` её не пропускает, поэтому берём первое
 * непустое значение явно.
 *
 * Переменные без `NEXT_PUBLIC_` в middleware (Edge) обычно недоступны; ключ
 * должен попасть в билд через `NEXT_PUBLIC_*` и `build.env_file` в compose.
 */
function firstNonEmptyEnv(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === '') {
      continue
    }
    const trimmed = candidate.trim()
    if (trimmed !== '') {
      return trimmed
    }
  }
  return undefined
}

export function getSupabaseUrl(): string {
  const url = firstNonEmptyEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL,
  )
  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL',
    )
  }
  return url
}

export function getSupabaseAnonKey(): string {
  const key = firstNonEmptyEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
  )
  if (!key) {
    throw new Error(
      'Missing Supabase anon/publishable key: set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (build/client), and/or SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY (server runtime, e.g. Docker).',
    )
  }
  return key
}
