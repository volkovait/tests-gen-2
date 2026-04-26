"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LABELS } from "@/lib/consts"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ExternalLink, Loader2, Pencil } from "lucide-react"

interface LearnViewClientProps {
  lessonId: string
  lessonTitle: string
}

export function LearnViewClient({ lessonId, lessonTitle }: LearnViewClientProps) {
  const router = useRouter()
  const docUrl = `/learn/${lessonId}/document`
  const [editMode, setEditMode] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [iframeKey, setIframeKey] = useState(0)
  const [headerTitle, setHeaderTitle] = useState(lessonTitle)

  const submitEdit = async () => {
    const text = instruction.trim()
    if (!text || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/lesson-ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, instruction: text }),
      })
      const data = (await res.json()) as { error?: string; title?: string; validationWarnings?: string[] }
      if (!res.ok) throw new Error(data.error || LABELS.LEARN_EDIT_ERROR_GENERIC)
      if (typeof data.title === "string" && data.title.length > 0) {
        setHeaderTitle(data.title)
      }
      const warns = Array.isArray(data.validationWarnings) ? data.validationWarnings : []
      if (warns.length > 0 && typeof window !== "undefined") {
        window.alert(
          `${LABELS.LESSON_PARTIAL_VALIDATION_ALERT_TITLE}\n\n${LABELS.LESSON_PARTIAL_VALIDATION_ALERT_INTRO}\n\n${warns.join("\n\n")}`,
        )
      }
      setInstruction("")
      setEditMode(false)
      setIframeKey((k) => k + 1)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : LABELS.LEARN_EDIT_ERROR_GENERIC)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#EFE2BA] px-4 py-8">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-[#C5CBE3] bg-white px-4 py-4 shadow-sm">
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#4056A1] md:text-3xl">{headerTitle}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="border-2 border-[#4056A1] text-[#4056A1]">
                <Link href="/dashboard">{LABELS.LEARN_VIEW_TO_CABINET}</Link>
              </Button>
              <Button size="sm" asChild className="bg-[#D79922] text-white hover:bg-[#c2891c]">
                <a href={docUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {LABELS.LEARN_VIEW_NEW_TAB}
                </a>
              </Button>
              {!editMode ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="border-2 border-[#4056A1] bg-white text-[#4056A1] hover:bg-[#EFE2BA]"
                  onClick={() => {
                    setError(null)
                    setEditMode(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  {LABELS.LEARN_EDIT_WITH_AI}
                </Button>
              ) : null}
            </div>
          </div>

          {editMode ? (
            <div className="mb-4 rounded-xl border-2 border-[#4056A1] bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-[#4056A1]">{LABELS.LEARN_EDIT_INSTRUCTION_LABEL}</p>
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={LABELS.LEARN_EDIT_INSTRUCTION_PLACEHOLDER}
                rows={4}
                maxLength={8000}
                className="mb-3 border-[#C5CBE3]"
                disabled={loading}
              />
              {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-[#4056A1] text-white hover:bg-[#35488a]"
                  disabled={loading || !instruction.trim()}
                  onClick={() => void submitEdit()}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {LABELS.LEARN_EDIT_SUBMIT}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => {
                    setEditMode(false)
                    setError(null)
                    setInstruction("")
                  }}
                >
                  {LABELS.LEARN_EDIT_CANCEL}
                </Button>
              </div>
            </div>
          ) : null}

          <iframe
            key={iframeKey}
            title={headerTitle}
            className="w-full min-h-[calc(100vh-14rem)] rounded-xl border-2 border-[#4056A1] bg-white shadow-md"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            src={docUrl}
          />
        </div>
      </main>
  )
}
