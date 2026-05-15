import { createClient } from "@/lib/supabase/server"
import { isAuthDisabled, resolveActingUserId } from "@/lib/auth/auth-disabled"
import { NextRequest, NextResponse } from "next/server"

interface Answer {
  questionId: string
  answer: string | number | null
  isCorrect?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!isAuthDisabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const actingUserId = resolveActingUserId(user)
    if (actingUserId === undefined) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { testId, answers, timeSpent } = body as {
      testId: string
      answers: Answer[]
      timeSpent: number
    }

    if (!testId || !answers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the test to validate and calculate score
    const { data: test, error: testError } = await supabase
      .from("tests")
      .select("questions, user_id")
      .eq("id", testId)
      .single()

    if (testError || !test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 })
    }

    // Verify user owns this test
    if (user !== null && test.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Calculate score
    const questions = test.questions as Array<{
      id: string
      type: string
      correctAnswer: string | number
    }>

    let correctCount = 0
    const gradedAnswers = answers.map(answer => {
      const question = questions.find(q => q.id === answer.questionId)
      if (!question) return { ...answer, isCorrect: false }

      let isCorrect = false
      if (question.type === "multiple_choice") {
        isCorrect = answer.answer === question.correctAnswer
      } else if (question.type === "true_false") {
        isCorrect = answer.answer?.toString().toLowerCase() === question.correctAnswer.toString().toLowerCase()
      } else if (question.type === "fill_blank") {
        isCorrect = answer.answer?.toString().toLowerCase().trim() === question.correctAnswer.toString().toLowerCase().trim()
      }

      if (isCorrect) correctCount++
      return { ...answer, isCorrect }
    })

    const totalQuestions = questions.length
    const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

    // Save test attempt
    const { data: attempt, error: insertError } = await supabase
      .from("test_attempts")
      .insert({
        test_id: testId,
        user_id: actingUserId,
        answers: gradedAnswers,
        score: correctCount,
        total_questions: totalQuestions,
        percentage: Math.round(percentage * 100) / 100,
        time_spent_seconds: timeSpent,
        completed_at: new Date().toISOString()
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("[v0] Failed to save attempt:", insertError)
      return NextResponse.json({ error: "Failed to save test attempt" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      score: correctCount,
      total: totalQuestions,
      percentage: Math.round(percentage * 100) / 100
    })

  } catch (error) {
    console.error("[v0] Submit test error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}
