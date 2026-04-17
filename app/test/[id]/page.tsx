import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
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
  
  if (!user) {
    redirect("/auth/login")
  }

  const { data: test, error } = await supabase
    .from("tests")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !test) {
    notFound()
  }

  return <TestTakingClient test={test as Test} userId={user.id} />
}
