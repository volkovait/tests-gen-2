import { telegramUndiciFetch } from '@/lib/telegram/telegram-fetch'
import { setDefaultResultOrder } from 'node:dns'

setDefaultResultOrder('ipv4first')

type TelegramApiResponse = { ok?: boolean; description?: string }

const TELEGRAM_FETCH_TIMEOUT_MS = 25_000

export type SendLessonBotMessageResult =
  | { outcome: 'success' }
  | { outcome: 'telegram_api_error'; description: string; httpStatus: number }
  | { outcome: 'network_error'; description: string }

function formatErrorChain(e: unknown): string {
  if (!(e instanceof Error)) return String(e)
  const parts: string[] = [e.message]
  let depth = 0
  let c: unknown = e.cause
  while (c instanceof Error && depth < 6) {
    parts.push(c.message)
    c = c.cause
    depth += 1
  }
  return parts.join(' — ')
}

/** sendMessage к Bot API с теми же TLS/прокси/IPv4, что и уроки. */
export async function sendLessonTelegramBotMessage(params: {
  botToken: string
  chatId: string
  text: string
  parse_mode?: 'HTML'
  logTag?: string
}): Promise<SendLessonBotMessageResult> {
  const tag = params.logTag ?? '[telegram-bot]'
  const url = `https://api.telegram.org/bot${params.botToken}/sendMessage`
  try {
    const res = await telegramUndiciFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: params.chatId,
        text: params.text,
        ...(params.parse_mode ? { parse_mode: params.parse_mode } : {}),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(TELEGRAM_FETCH_TIMEOUT_MS),
    })
    const data = (await res.json().catch(() => null)) as TelegramApiResponse | null
    if (!res.ok || !data || data.ok !== true) {
      const desc = data?.description ?? res.statusText
      return { outcome: 'telegram_api_error', description: desc, httpStatus: res.status }
    }
    return { outcome: 'success' }
  } catch (e) {
    const description = formatErrorChain(e)
    console.error(`${tag} sendMessage fetch failed`, description)
    return { outcome: 'network_error', description }
  }
}
