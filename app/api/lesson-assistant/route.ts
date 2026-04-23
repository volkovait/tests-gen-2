import { createClient } from '@/lib/supabase/server'
import { createAssistantRequestLogDir } from '@/lib/gigachat/model-request-log'
import { gigachatChatCompletion } from '@/lib/gigachat'
import { lessonAssistantBodySchema } from '@/lib/lesson-meta'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

const ASSISTANT_SYSTEM = `Ты — дружелюбный ассистент Lingua-Bloom по созданию языковых тестов.
Помоги пользователю уточнить тему, уровень (A1–C2), целевой язык и формат заданий. Отвечай по-русски, кратко (2–5 предложений или немного пунктов). Не генерируй HTML — только диалог.`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json: unknown = await request.json()
    const parsed = lessonAssistantBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
    }

    const messages = [{ role: 'system' as const, content: ASSISTANT_SYSTEM }, ...parsed.data.messages]
    const assistantLogDir = await createAssistantRequestLogDir()
    const reply = await gigachatChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 1024,
      log: { outputDir: assistantLogDir, fileBase: 'assistant-chat' },
    })
    return NextResponse.json({ message: reply })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    console.error('[lesson-assistant]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
