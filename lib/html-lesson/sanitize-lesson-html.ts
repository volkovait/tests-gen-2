/**
 * Fixes common LLM mistakes in stored lesson HTML before serving in a strict CSP iframe.
 */
export function sanitizeLessonHtmlForDelivery(html: string): string {
  // Fonts mistakenly loaded as external scripts (breaks script-src and does not apply CSS).
  return html.replace(
    /<script\b[^>]*\bsrc=["'][^"']*(?:googleapis\.com|gstatic\.com)[^"']*["'][^>]*>\s*<\/script>/gi,
    '',
  )
}
