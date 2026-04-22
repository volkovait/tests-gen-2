import { createClient } from '@/lib/supabase/server'
import { getLessonTelegramCredentials } from '@/lib/html-lesson/lesson-telegram'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const bodySchema = z.object({
  parts: z.array(z.string().min(1).max(4096)).min(1).max(40),
  parse_mode: z.literal('HTML').optional().default('HTML'),
})

type TelegramApiResponse = { ok?: boolean; description?: string }

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
    const url = `https://api.telegram.org/bot${creds.botToken}/sendMessage`

    for (let i = 0; i < parts.length; i += 1) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: creds.chatId,
          text: parts[i],
          parse_mode,
          disable_web_page_preview: true,
        }),
      })
      const data = (await res.json().catch(() => null)) as TelegramApiResponse | null
      if (!res.ok || !data || data.ok !== true) {
        const desc = data?.description ?? res.statusText
        return NextResponse.json(
          { ok: false, error: 'Telegram request failed', partIndex: i, description: desc },
          { status: 502 },
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
