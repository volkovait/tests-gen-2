/**
 * Убирает разметку и приводит сущности к виду, пригодному для sendMessage без parse_mode.
 */
export function stripHtmlForTelegramPlain(html: string): string {
  let s = html
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<\/p>/gi, '\n')
  s = s.replace(/<\/div>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  s = decodeBasicHtmlEntities(s)
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return s.trim()
}

function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}
