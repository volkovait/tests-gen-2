import { createClient } from '@/lib/supabase/server'
import { isAuthDisabled } from '@/lib/auth/auth-disabled'
import { createAssistantRequestLogDir } from '@/lib/gigachat/model-request-log'
import { llmChatCompletion } from '@/lib/llm/chat-completion'
import { lessonAssistantBodySchema } from '@/lib/lesson-meta'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

const ASSISTANT_SYSTEM = `Ты — дружелюбный ассистент Lingua-Bloom по созданию интерактивных уроков по иностранному языку и другим предметам. Пользователь предоставит тебе материал либо уже с тестами, либо без. Твоя задача - преобразовать этот материал в готовую интерактивную страницу.`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!isAuthDisabled() && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json: unknown = await request.json()
    const parsed = lessonAssistantBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
    }

    const messages = [{ role: 'system' as const, content: ASSISTANT_SYSTEM }, ...parsed.data.messages]
    const assistantLogDir = await createAssistantRequestLogDir()
    const reply = await llmChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 1024,
      ...(assistantLogDir
        ? { log: { outputDir: assistantLogDir, fileBase: 'assistant-chat' as const } }
        : {}),
    })
    return NextResponse.json({ message: reply })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    console.error('[lesson-assistant]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
