/**
 * Credentials for Telegram sendMessage (server only, via `/api/lesson-send-telegram`).
 * Задайте LESSON_TELEGRAM_BOT_TOKEN и LESSON_TELEGRAM_CHAT_ID в окружении.
 * При блокировке исходящего HTTPS к api.telegram.org: TELEGRAM_HTTPS_PROXY или HTTPS_PROXY/HTTP_PROXY (см. `lib/telegram/telegram-fetch.ts`).
 */
export function getLessonTelegramCredentials(): { botToken: string; chatId: string } | null {
  const botToken = process.env.LESSON_TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.LESSON_TELEGRAM_CHAT_ID?.trim()
  if (!botToken || !chatId) {
    return null
  }
  return { botToken, chatId }
}
