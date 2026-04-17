import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

interface Question {
  id: string
  type: "multiple_choice" | "true_false" | "fill_blank"
  question: string
  options?: string[]
  correctAnswer: string | number
  explanation?: string
}

interface ParsedQuestion {
  question: string
  options?: string[]
  correct_answer: string | number
  explanation?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const questionCount = parseInt(formData.get("questionCount") as string) || 10
    const questionTypes = JSON.parse(formData.get("questionTypes") as string) as string[]
    const difficulty = formData.get("difficulty") as string || "medium"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const PDF_AI_API_KEY = process.env.PDF_AI_API_KEY

    if (!PDF_AI_API_KEY) {
      return NextResponse.json({ error: "PDF.ai API key not configured" }, { status: 500 })
    }

    // Step 1: Upload PDF to PDF.ai for parsing
    const pdfFormData = new FormData()
    pdfFormData.append("file", file)

    const uploadResponse = await fetch("https://api.pdf.ai/v1/upload", {
      method: "POST",
      headers: {
        "X-API-Key": PDF_AI_API_KEY
      },
      body: pdfFormData
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}))
      console.error("[v0] PDF.ai upload error:", errorData)
      return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 })
    }

    const uploadData = await uploadResponse.json()
    const docId = uploadData.docId

    // Step 2: Generate questions using the chat API
    const questionTypesStr = questionTypes.map(t => {
      switch(t) {
        case "multiple_choice": return "multiple choice questions with 4 options (A, B, C, D)"
        case "true_false": return "true/false questions"
        case "fill_blank": return "fill in the blank questions"
        default: return t
      }
    }).join(", ")

    const prompt = `Based on the content of this document, generate exactly ${questionCount} ${difficulty} difficulty quiz questions. 

Include the following question types: ${questionTypesStr}.

Format your response as a JSON array with the following structure for each question:
[
  {
    "type": "multiple_choice" | "true_false" | "fill_blank",
    "question": "The question text",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"], // only for multiple_choice
    "correct_answer": 0, // index for multiple_choice, "true"/"false" for true_false, or the answer string for fill_blank
    "explanation": "Brief explanation of why this is the correct answer"
  }
]

Important:
- For multiple choice, correct_answer should be the index (0-3) of the correct option
- For true/false, correct_answer should be "true" or "false"
- For fill in the blank, correct_answer should be the exact word or phrase that fills the blank
- Make questions educational and relevant to the document content
- Vary the difficulty appropriately
- Include clear explanations

Return ONLY the JSON array, no other text.`

    const chatResponse = await fetch("https://api.pdf.ai/v1/chat", {
      method: "POST",
      headers: {
        "X-API-Key": PDF_AI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        docId,
        message: prompt
      })
    })

    if (!chatResponse.ok) {
      const errorData = await chatResponse.json().catch(() => ({}))
      console.error("[v0] PDF.ai chat error:", errorData)
      return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
    }

    const chatData = await chatResponse.json()
    let questionsText = chatData.content || chatData.message || ""

    // Extract JSON from the response
    const jsonMatch = questionsText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error("[v0] No JSON found in response:", questionsText)
      return NextResponse.json({ error: "Failed to parse generated questions" }, { status: 500 })
    }

    let parsedQuestions: ParsedQuestion[]
    try {
      parsedQuestions = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error("[v0] JSON parse error:", e)
      return NextResponse.json({ error: "Failed to parse generated questions" }, { status: 500 })
    }

    // Transform questions to our format
    const questions: Question[] = parsedQuestions.map((q: ParsedQuestion, index: number) => ({
      id: `q-${index + 1}`,
      type: q.type as Question["type"],
      question: q.question,
      options: q.options,
      correctAnswer: q.correct_answer,
      explanation: q.explanation
    }))

    // Step 3: Save test to database
    const { data: test, error: dbError } = await supabase
      .from("tests")
      .insert({
        user_id: user.id,
        title: title || file.name.replace(".pdf", ""),
        source_filename: file.name,
        question_count: questions.length,
        questions: questions,
        settings: {
          difficulty,
          questionTypes
        }
      })
      .select("id")
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({ error: "Failed to save test" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      testId: test.id,
      questionCount: questions.length
    })

  } catch (error) {
    console.error("[v0] Generate test error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}
