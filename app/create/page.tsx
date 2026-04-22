"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LABELS } from "@/lib/consts"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Send, Sparkles } from "lucide-react"

type Role = "user" | "assistant"

interface Msg {
  role: Role
  content: string
}

export default function CreateLessonPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>([])
  const [lessonTitle, setLessonTitle] = useState("")
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setError(null)
    setInput("")
    const nextUser: Msg = { role: "user", content: text }
    setMessages((m) => [...m, nextUser])
    setLoading(true)
    try {
      const apiMessages = [...messages, nextUser].map((x) => ({
        role: x.role as "user" | "assistant",
        content: x.content,
      }))
      const res = await fetch("/api/lesson-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error || LABELS.CREATE_ERROR_ASSISTANT)
      if (!data.message) throw new Error(LABELS.CREATE_ERROR_EMPTY)
      setMessages((m) => [...m, { role: "assistant", content: data.message as string }])
    } catch (e) {
      setError(e instanceof Error ? e.message : LABELS.CREATE_ERROR_GENERIC)
    } finally {
      setLoading(false)
    }
  }

  const generatePage = async () => {
    if (messages.length === 0) {
      setError(LABELS.CREATE_ERROR_NEED_MESSAGE)
      return
    }
    setGenLoading(true)
    setError(null)
    try {
      const apiMessages = messages.map((x) => ({
        role: x.role,
        content: x.content,
      }))
      const trimmedTitle = lessonTitle.trim()
      const res = await fetch("/api/generate-interactive-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "chat",
          messages: apiMessages,
          ...(trimmedTitle ? { title: trimmedTitle } : {}),
        }),
      })
      const data = (await res.json()) as { error?: string; lessonId?: string; viewUrl?: string }
      if (!res.ok) throw new Error(data.error || LABELS.CREATE_ERROR_GENERATION)
      if (data.lessonId) {
        router.push(data.viewUrl || `/learn/${data.lessonId}/view`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : LABELS.CREATE_ERROR_GENERIC)
    } finally {
      setGenLoading(false)
    }
  }

  return (
    <AppShell active="create">
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 md:hidden">
          <Link href="/dashboard" className="text-sm text-muted-foreground">
            {LABELS.CREATE_BACK_CABINET}
          </Link>
        </div>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-serif">{LABELS.CREATE_PAGE_TITLE}</CardTitle>
            <CardDescription>{LABELS.CREATE_PAGE_DESCRIPTION}</CardDescription>
          </CardHeader>
        </Card>

        {error && <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <Card>
          <CardContent className="flex max-h-[min(60vh,520px)] flex-col gap-3 p-4">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">{LABELS.CREATE_HINT_EXAMPLE}</p>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={`${i}-${msg.role}`}
                    className={`rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "ml-4 bg-primary text-primary-foreground" : "mr-4 bg-card text-foreground shadow-sm"}`}
                  >
                    {msg.content}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {LABELS.CREATE_ASSISTANT_TYPING}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-title" className="text-muted-foreground">
                {LABELS.CREATE_LESSON_TITLE_LABEL}{" "}
                <span className="font-normal">({LABELS.CREATE_LESSON_TITLE_OPTIONAL})</span>
              </Label>
              <Input
                id="lesson-title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder={LABELS.CREATE_LESSON_TITLE_PLACEHOLDER}
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={LABELS.CREATE_PLACEHOLDER_MESSAGE}
                rows={2}
                className="min-h-[72px] flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void sendMessage()
                  }
                }}
              />
              <Button type="button" disabled={loading || !input.trim()} onClick={() => void sendMessage()} className="sm:self-end">
                <Send className="h-4 w-4" />
                {LABELS.CREATE_SEND}
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="btn-cta-gold w-full border-0 sm:w-auto"
              disabled={genLoading || messages.length === 0}
              onClick={() => void generatePage()}
            >
              {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {LABELS.CREATE_GENERATE_LESSON_PAGE}
            </Button>
          </CardContent>
        </Card>
      </main>
    </AppShell>
  )
}
