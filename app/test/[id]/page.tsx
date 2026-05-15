import { createClient } from "@/lib/supabase/server"
import { isAuthDisabled } from "@/lib/auth/auth-disabled"
import { notFound, redirect } from "next/navigation"
import TestTakingClient from "./test-client"

interface Question {
  id: string
  type: "multiple_choice" | "true_false" | "fill_blank"
  question: string
  options?: string[]
  correctAnswer: string | number
  explanation?: string
}

interface Test {
  id: string
  title: string
  description: string | null
  source_filename: string | null
  question_count: number
  questions: Question[]
  settings: {
    difficulty?: string
    questionTypes?: string[]
  }
  created_at: string
}

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!isAuthDisabled() && !user) {
    redirect("/auth/login")
  }

  let testQuery = supabase.from("tests").select("*").eq("id", id)
  if (user !== null) {
    testQuery = testQuery.eq("user_id", user.id)
  }

  const { data: test, error } = await testQuery.single()

  if (error || !test) {
    notFound()
  }

  return <TestTakingClient test={test as Test} />
}
