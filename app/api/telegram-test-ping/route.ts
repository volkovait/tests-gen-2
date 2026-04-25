import { createClient } from '@/lib/supabase/server'
import { getLessonTelegramCredentials } from '@/lib/html-lesson/lesson-telegram'
import { sendLessonTelegramBotMessage } from '@/lib/telegram/send-lesson-bot-message'
import { isTelegramTestPingAuthBypassed } from '@/lib/telegram/telegram-test-ping-auth'
import { nextJsonTelegramUnreachable } from '@/lib/telegram/telegram-unreachable-response'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LOG = '[telegram-test-ping]'

/**
 * Тест: сервер → api.telegram.org с того же кода, что уроки (прокси, IPv4-first).
 * С главной страницы (credentials: include) vs сгенерированный документ — сравнение окружения.
 */
export async function POST() {
  try {
    if (!isTelegramTestPingAuthBypassed()) {
      const supabase = await createClient()
      const {
        data: { user: userFromGetUser },
      } = await supabase.auth.getUser()

      let user = userFromGetUser
      if (!user) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        user = session?.user ?? null
        if (user) {
          console.warn(`${LOG} using getSession() fallback (getUser returned null); session may need refresh`)
        }
      }

      if (!user) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Unauthorized',
            description:
              'Сессия не найдена: обновите страницу и войдите снова. Локально: `pnpm dev` без входа, или TELEGRAM_TEST_PING_SKIP_AUTH=true при `next start`.',
          },
          { status: 401 },
        )
      }
    } else {
      console.warn(`${LOG} auth skipped (NODE_ENV=development or TELEGRAM_TEST_PING_SKIP_AUTH)`)
    }

    const creds = getLessonTelegramCredentials()
    if (!creds) {
      return NextResponse.json({ ok: false, error: 'Telegram is not configured on the server' }, { status: 503 })
    }

    const result = await sendLessonTelegramBotMessage({
      botToken: creds.botToken,
      chatId: creds.chatId,
      text: 'Привет',
      logTag: LOG,
    })

    if (result.outcome === 'success') {
      return NextResponse.json({ ok: true })
    }

    if (result.outcome === 'network_error') {
      return nextJsonTelegramUnreachable(`ping: ${result.description}`, LOG)
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Telegram request failed',
        description: result.description,
      },
      { status: 502 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    console.error(`${LOG} exception`, e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
