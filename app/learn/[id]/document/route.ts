import { createClient } from '@/lib/supabase/server'
import { isAuthDisabled } from '@/lib/auth/auth-disabled'
import { LABELS } from '@/lib/consts'
import { sanitizeLessonHtmlForDelivery } from '@/lib/html-lesson/sanitize-lesson-html'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  if (!isAuthDisabled()) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(LABELS.LEARN_DOC_AUTH_REQUIRED, { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }
  }

  const { data: lesson, error } = await supabase.from('lessons').select('html_body').eq('id', id).maybeSingle()

  if (error || !lesson?.html_body) {
    return new NextResponse(LABELS.LEARN_DOC_NOT_FOUND, { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const csp = [
    "default-src 'self'",
    // Модели иногда ошибочно вставляют шрифты как <script src="...google..."> — разрешаем источник, но в промпте требуем только <link rel="stylesheet">.
    "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://ajax.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "connect-src 'self'",
    "base-uri 'none'",
  ].join('; ')

  const body = sanitizeLessonHtmlForDelivery(lesson.html_body as string)

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, max-age=120',
      'Content-Security-Policy': csp,
    },
  })
}
