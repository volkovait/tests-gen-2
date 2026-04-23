import { createClient } from '@/lib/supabase/server'
import { getLessonTelegramCredentials } from '@/lib/html-lesson/lesson-telegram'
import { stripHtmlForTelegramPlain } from '@/lib/telegram/strip-html-for-plain'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const bodySchema = z.object({
  parts: z.array(z.string().min(1).max(4096)).min(1).max(40),
  parse_mode: z.literal('HTML').optional().default('HTML'),
})

type TelegramApiResponse = { ok?: boolean; description?: string }

const TELEGRAM_MAX = 4096

async function sendTelegramMessage(params: {
  botToken: string
  chatId: string
  text: string
  parse_mode?: 'HTML'
}): Promise<{ ok: true } | { ok: false; description: string; status: number }> {
  const url = `https://api.telegram.org/bot${params.botToken}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: params.chatId,
      text: params.text,
      ...(params.parse_mode ? { parse_mode: params.parse_mode } : {}),
      disable_web_page_preview: true,
    }),
  })
  const data = (await res.json().catch(() => null)) as TelegramApiResponse | null
  if (!res.ok || !data || data.ok !== true) {
    const desc = data?.description ?? res.statusText
    return { ok: false, description: desc, status: res.status }
  }
  return { ok: true }
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

      if (withHtml.ok) {
        continue
      }

      console.error(
        '[lesson-send-telegram] HTML send failed',
        JSON.stringify({ partIndex: i, description: withHtml.description, httpStatus: withHtml.status }),
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

      if (!plainResult.ok) {
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
