import { createClient } from "@/lib/supabase/server"
import { isAuthDisabled } from "@/lib/auth/auth-disabled"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!isAuthDisabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: lesson } = await supabase
      .from("lessons")
      .select("user_id")
      .eq("id", id)
      .single()

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    if (user !== null && lesson.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase.from("lessons").delete().eq("id", id)

    if (error) {
      console.error("[lessons] Delete error:", error)
      return NextResponse.json({ error: "Failed to delete lesson" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[lessons] Delete error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 },
    )
  }
}
