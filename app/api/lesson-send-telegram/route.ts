import { createClient } from '@/lib/supabase/server'
import { getLessonTelegramCredentials } from '@/lib/html-lesson/lesson-telegram'
import { telegramProxyEnvIsSet, telegramUndiciFetch } from '@/lib/telegram/telegram-fetch'
import { stripHtmlForTelegramPlain } from '@/lib/telegram/strip-html-for-plain'
import { setDefaultResultOrder } from 'node:dns'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

/** Снижает частые «fetch failed» в serverless: попытка IPv6 к внешним API может обрываться, IPv4 — работает. */
setDefaultResultOrder('ipv4first')

const bodySchema = z.object({
  parts: z.array(z.string().min(1).max(4096)).min(1).max(40),
  parse_mode: z.literal('HTML').optional().default('HTML'),
})

type TelegramApiResponse = { ok?: boolean; description?: string }

const TELEGRAM_MAX = 4096
const TELEGRAM_FETCH_TIMEOUT_MS = 25_000

type SendMessageResult =
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

async function sendTelegramMessage(params: {
  botToken: string
  chatId: string
  text: string
  parse_mode?: 'HTML'
}): Promise<SendMessageResult> {
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
    console.error('[lesson-send-telegram] sendMessage fetch failed', description)
    return { outcome: 'network_error', description }
  }
}

function jsonTelegramUnreachable(logDetail: string) {
  console.error('[lesson-send-telegram] unreachable', logDetail)
  const base =
    'Не удалось связаться с api.telegram.org (Bot API по HTTPS). Если с сервера нет прямого доступа — задайте реальный URL в TELEGRAM_HTTPS_PROXY или HTTPS_PROXY и перезапустите приложение.'
  const proxyDnsFail =
    telegramProxyEnvIsSet() && /\bENOTFOUND\b|\bEAI_AGAIN\b/i.test(logDetail)
      ? ' Сейчас в env указан прокси, но имя хоста прокси не находится в DNS (часто оставляют пример вроде proxy.example.com) — замените на рабочий хост:порт или удалите TELEGRAM_HTTPS_PROXY/HTTPS_PROXY, если прокси не используете.'
      : ''
  return NextResponse.json(
    {
      ok: false,
      error: 'telegram_unreachable',
      description: base + proxyDnsFail,
    },
    { status: 503 },
  )
}

/** Прокси sendMessage: токен только на сервере, из iframe нет CORS к api.telegram.org. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const creds = getLessonTelegramCredentials()
    if (!creds) {
      return NextResponse.json({ error: 'Telegram is not configured on the server' }, { status: 503 })
    }

    const json: unknown = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
    }

    const { parts, parse_mode } = parsed.data

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      const withHtml = await sendTelegramMessage({
        botToken: creds.botToken,
        chatId: creds.chatId,
        text: part,
        parse_mode: parse_mode === 'HTML' ? 'HTML' : undefined,
      })

      if (withHtml.outcome === 'success') {
        continue
      }

      if (withHtml.outcome === 'network_error') {
        return jsonTelegramUnreachable(`part ${i} HTML: ${withHtml.description}`)
      }

      console.error(
        '[lesson-send-telegram] HTML send failed',
        JSON.stringify({
          partIndex: i,
          description: withHtml.description,
          httpStatus: withHtml.httpStatus,
        }),
      )

      const plain = stripHtmlForTelegramPlain(part).slice(0, TELEGRAM_MAX)
      if (!plain.trim()) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Telegram request failed',
            partIndex: i,
            description: withHtml.description,
          },
          { status: 502 },
        )
      }

      const plainResult = await sendTelegramMessage({
        botToken: creds.botToken,
        chatId: creds.chatId,
        text: plain,
      })

      if (plainResult.outcome === 'network_error') {
        return jsonTelegramUnreachable(`part ${i} plain: ${plainResult.description}`)
      }

      if (plainResult.outcome !== 'success') {
        console.error(
          '[lesson-send-telegram] plain fallback failed',
          JSON.stringify({ partIndex: i, description: plainResult.description }),
        )
        return NextResponse.json(
          {
            ok: false,
            error: 'Telegram request failed',
            partIndex: i,
            description: plainResult.description,
            htmlError: withHtml.description,
          },
          { status: 502 },
        )
      }

      console.warn('[lesson-send-telegram] part sent as plain text fallback', { partIndex: i })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    console.error('[lesson-send-telegram] exception', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
