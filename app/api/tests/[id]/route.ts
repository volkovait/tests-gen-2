import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns this test before deleting
    const { data: test } = await supabase
      .from("tests")
      .select("user_id")
      .eq("id", id)
      .single()

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 })
    }

    if (test.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete the test (attempts will be cascade deleted)
    const { error } = await supabase
      .from("tests")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[v0] Delete test error:", error)
      return NextResponse.json({ error: "Failed to delete test" }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[v0] Delete test error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: test, error } = await supabase
      .from("tests")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error || !test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 })
    }

    return NextResponse.json(test)

  } catch (error) {
    console.error("[v0] Get test error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    )
  }
}
