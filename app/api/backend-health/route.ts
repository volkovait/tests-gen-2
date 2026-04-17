import { NextResponse } from 'next/server'

function healthUrl(): string {
  const raw =
    process.env.STATIC_SERVER_URL ??
    process.env.NEXT_PUBLIC_STATIC_SERVER_URL ??
    'http://127.0.0.1:3001'
  const trimmed = raw.replace(/\/$/, '')
  if (trimmed.endsWith('/health')) {
    return trimmed
  }
  return `${trimmed}/health`
}

/**
 * Проверка доступности Express static-server (`GET /health`).
 * Запуск: `pnpm serve:static` (порт по умолчанию 3001).
 */
export async function GET() {
  const url = healthUrl()
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(t)
    const text = await res.text()
    let upstream: unknown
    try {
      upstream = JSON.parse(text) as unknown
    } catch {
      upstream = text
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Express вернул не-OK статус',
          url,
          status: res.status,
          upstream,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Сервис отвечает',
      url,
      upstream,
    })
  } catch (e) {
    clearTimeout(t)
    const message = e instanceof Error ? e.message : 'Неизвестная ошибка'
    return NextResponse.json(
      {
        ok: false,
        message: 'Не удалось достучаться до Express',
        url,
        error: message,
      },
      { status: 503 },
    )
  }
}
