const STRIP_BOT_TOKEN_DECL = /\b(?:const|let|var)\s+botToken\s*=\s*['"][^'"]*['"]\s*;?/g
const STRIP_CHAT_ID_DECL = /\b(?:const|let|var)\s+chatId\s*=\s*(?:['"][^'"]*['"]|\d+)\s*;?/g

/** Убирает объявления токена из HTML теста: отправка только через серверный прокси. */
function stripTelegramClientSecrets(html: string): string {
  return html.replace(STRIP_BOT_TOKEN_DECL, '').replace(STRIP_CHAT_ID_DECL, '')
}

/**
 * Fixes common LLM mistakes in stored lesson HTML before serving in a strict CSP iframe.
 */
export function sanitizeLessonHtmlForDelivery(html: string): string {
  let out = stripTelegramClientSecrets(html)
  // Fonts mistakenly loaded as external scripts (breaks script-src and does not apply CSS).
  out = out.replace(
    /<script\b[^>]*\bsrc=["'][^"']*(?:googleapis\.com|gstatic\.com)[^"']*["'][^>]*>\s*<\/script>/gi,
    '',
  )
  return out
}
