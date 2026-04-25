/**
 * Локальный `next dev`: без входа в Supabase, иначе тест кнопки всегда 401.
 * `next start` / прод: только с сессией, либо явно TELEGRAM_TEST_PING_SKIP_AUTH=true в .env (только для отладки).
 */
export function isTelegramTestPingAuthBypassed(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return process.env.TELEGRAM_TEST_PING_SKIP_AUTH === 'true'
}
