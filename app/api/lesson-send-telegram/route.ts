import { createClient } from '@/lib/supabase/server'
import { getLessonTelegramCredentials } from '@/lib/html-lesson/lesson-telegram'
import { sendLessonTelegramBotMessage } from '@/lib/telegram/send-lesson-bot-message'
import { stripHtmlForTelegramPlain } from '@/lib/telegram/strip-html-for-plain'
import { nextJsonTelegramUnreachable } from '@/lib/telegram/telegram-unreachable-response'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const LOG = '[lesson-send-telegram]'

const bodySchema = z.object({
  parts: z.array(z.string().min(1).max(4096)).min(1).max(40),
  parse_mode: z.literal('HTML').optional().default('HTML'),
})

const TELEGRAM_MAX = 4096

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
      const withHtml = await sendLessonTelegramBotMessage({
        botToken: creds.botToken,
        chatId: creds.chatId,
        text: part,
        parse_mode: parse_mode === 'HTML' ? 'HTML' : undefined,
        logTag: LOG,
      })

      if (withHtml.outcome === 'success') {
        continue
      }

      if (withHtml.outcome === 'network_error') {
        return nextJsonTelegramUnreachable(`part ${i} HTML: ${withHtml.description}`, LOG)
      }

      console.error(
        `${LOG} HTML send failed`,
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

      const plainResult = await sendLessonTelegramBotMessage({
        botToken: creds.botToken,
        chatId: creds.chatId,
        text: plain,
        logTag: LOG,
      })

      if (plainResult.outcome === 'network_error') {
        return nextJsonTelegramUnreachable(`part ${i} plain: ${plainResult.description}`, LOG)
      }

      if (plainResult.outcome !== 'success') {
        console.error(
          `${LOG} plain fallback failed`,
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

      console.warn(`${LOG} part sent as plain text fallback`, { partIndex: i })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    console.error(`${LOG} exception`, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
