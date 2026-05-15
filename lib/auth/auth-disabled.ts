const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

function envFlag(value: string | undefined): boolean {
  if (value === undefined) {
    return false
  }
  return TRUTHY.has(value.toLowerCase().trim())
}

/**
 * Временный режим без обязательного входа (демо / внутренний стенд).
 *
 * Для `middleware` (Edge) задайте **`NEXT_PUBLIC_AUTH_DISABLED=true`** и пересоберите
 * приложение, иначе в Edge может быть не видна только `AUTH_DISABLED`.
 *
 * Опционально: **`AUTH_DISABLED_IMPERSONATE_USER_ID`** — UUID пользователя в Supabase
 * для записи в БД (создание уроков, попытки тестов), когда гость без сессии.
 */
export function isAuthDisabled(): boolean {
  return (
    envFlag(process.env.AUTH_DISABLED) ||
    envFlag(process.env.NEXT_PUBLIC_AUTH_DISABLED)
  )
}

/** UUID из `profiles` / `auth.users` для операций с `user_id` при отключённой авторизации и без сессии. */
export function authDisabledImpersonateUserId(): string | null {
  const raw = process.env.AUTH_DISABLED_IMPERSONATE_USER_ID?.trim()
  if (raw === undefined || raw === '') {
    return null
  }
  return raw
}

/**
 * Актуальный `user_id` для записи в БД: из сессии или из `AUTH_DISABLED_IMPERSONATE_USER_ID`
 * при `isAuthDisabled()`. Иначе `undefined`.
 */
export function resolveActingUserId(user: { id: string } | null): string | undefined {
  if (user?.id) {
    return user.id
  }
  if (!isAuthDisabled()) {
    return undefined
  }
  return authDisabledImpersonateUserId() ?? undefined
}
