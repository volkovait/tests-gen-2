"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { ComponentProps } from "react"
import TestTakingClient from "../[id]/test-client"
import { LABELS } from "@/lib/consts"

type TestModel = ComponentProps<typeof TestTakingClient>["test"]

const STORAGE_KEY = "linguaBloomDraftTest"

function readDraftFromStorage(): TestModel | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TestModel
  } catch {
    return null
  }
}

export default function DraftTestPage() {
  const router = useRouter()
  const [test, setTest] = useState<TestModel | null | undefined>(undefined)

  useEffect(() => {
    setTest(readDraftFromStorage())
  }, [])

  useEffect(() => {
    if (test === null) {
      router.replace("/upload")
    }
  }, [test, router])

  if (test === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        {LABELS.DRAFT_LOADING}
      </div>
    )
  }

  if (test === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        {LABELS.DRAFT_REDIRECTING}
      </div>
    )
  }

  return <TestTakingClient test={test} />
}
