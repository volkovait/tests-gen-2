import { createClient } from "@/lib/supabase/server"
import { isAuthDisabled, resolveActingUserId } from "@/lib/auth/auth-disabled"
import { z } from "zod"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

const bodySchema = z.object({
  lessonId: z.string().uuid(),
  score: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
})

/** Сохраняет попытку прохождения теста (данные могут приходить из сгенерированной страницы через ваш клиент). */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!isAuthDisabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const actingUserId = resolveActingUserId(user)
    if (actingUserId === undefined) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json: unknown = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 })
    }

    const { lessonId, score, totalQuestions, payload } = parsed.data
    const percentage = (score / totalQuestions) * 100

    let lessonQuery = supabase.from("lessons").select("id").eq("id", lessonId)
    if (user !== null) {
      lessonQuery = lessonQuery.eq("user_id", user.id)
    }
    const { data: lesson } = await lessonQuery.maybeSingle()
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const { error } = await supabase.from("lesson_attempts").insert({
      lesson_id: lessonId,
      user_id: actingUserId,
      score,
      total_questions: totalQuestions,
      percentage,
      payload: payload ?? {},
      completed_at: new Date().toISOString(),
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
