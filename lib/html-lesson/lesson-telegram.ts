/**
 * Credentials for Telegram sendMessage (server only, via `/api/lesson-send-telegram`).
 * Задайте LESSON_TELEGRAM_BOT_TOKEN и LESSON_TELEGRAM_CHAT_ID в окружении.
 */
export function getLessonTelegramCredentials(): { botToken: string; chatId: string } | null {
  const botToken = process.env.LESSON_TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.LESSON_TELEGRAM_CHAT_ID?.trim()
  if (!botToken || !chatId) {
    return null
  }
  return { botToken, chatId }
}
