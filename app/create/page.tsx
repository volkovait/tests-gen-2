"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LABELS } from "@/lib/consts"
import {
  TASK_TYPE_OPTIONS,
  STUDENT_LEVELS,
  buildStructuredTestGenerationPrompt,
  type TaskTypeOption,
} from "@/lib/lessons/build-structured-test-chat-prompt"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Send, Sparkles } from "lucide-react"

type Role = "user" | "assistant"

interface Msg {
  role: Role
  content: string
}

function toggleTaskType(current: TaskTypeOption[], value: TaskTypeOption): TaskTypeOption[] {
  if (current.includes(value)) {
    return current.filter((t) => t !== value)
  }
  return [...current, value]
}

export default function CreateLessonPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>([])
  const [subject, setSubject] = useState("")
  const [taskCount, setTaskCount] = useState("")
  const [taskTypes, setTaskTypes] = useState<TaskTypeOption[]>([])
  const [studentLevel, setStudentLevel] = useState<string>("")
  const [input, setInput] = useState("")
  const [genLoading, setGenLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answersDialogOpen, setAnswersDialogOpen] = useState(false)
  const [correctAnswersReflection, setCorrectAnswersReflection] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const userMessages = messages.filter((m) => m.role === "user")
  const hasFirstUserMessage = userMessages.length >= 1

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    setError(null)
    setInput("")
    setMessages((m) => [...m, { role: "user", content: text }])
  }

  const openGenerateDialog = () => {
    if (!hasFirstUserMessage) {
      setError(LABELS.CREATE_ERROR_NEED_MESSAGE)
      return
    }
    setError(null)
    setCorrectAnswersReflection("")
    setAnswersDialogOpen(true)
  }

  const runGeneration = async () => {
    setGenLoading(true)
    setError(null)
    setAnswersDialogOpen(false)
    try {
      const structured = buildStructuredTestGenerationPrompt({
        userMessages,
        subject,
        taskCount,
        taskTypes,
        studentLevel,
        correctAnswersReflection,
      })
      const apiMessages = [{ role: "user" as const, content: structured }]
      const trimmedSubject = subject.trim()
      const res = await fetch("/api/generate-interactive-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "chat",
          messages: apiMessages,
          ...(trimmedSubject ? { title: trimmedSubject.slice(0, 200) } : {}),
        }),
      })
      const data = (await res.json()) as {
        error?: string
        lessonId?: string
        viewUrl?: string
        validationWarnings?: string[]
      }
      if (!res.ok) throw new Error(data.error || LABELS.CREATE_ERROR_GENERATION)
      if (data.lessonId) {
        const warns = Array.isArray(data.validationWarnings) ? data.validationWarnings : []
        if (warns.length > 0 && typeof window !== "undefined") {
          window.alert(
            `${LABELS.LESSON_PARTIAL_VALIDATION_ALERT_TITLE}\n\n${LABELS.LESSON_PARTIAL_VALIDATION_ALERT_INTRO}\n\n${warns.join("\n\n")}`,
          )
        }
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
      <main className="container mx-auto max-w-3xl px-4 py-6">
        {error ? (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Card className="border-2 border-[#C5CBE3] bg-white shadow-sm">
          <CardContent className="flex min-h-0 max-h-[min(72vh,640px)] flex-col gap-3 overflow-hidden p-4">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-md border border-[#C5CBE3] bg-[#EFE2BA]/40 p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">{LABELS.CREATE_HINT_EXAMPLE}</p>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={`${i}-${msg.role}`}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "ml-4 bg-[#4056A1] text-white"
                        : "mr-4 border border-border bg-card text-foreground shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {hasFirstUserMessage ? (
              <div className="space-y-3 rounded-lg border border-dashed border-[#4056A1]/40 bg-[#EFE2BA]/30 p-3">
                <p className="text-xs font-medium text-[#4056A1]">{LABELS.CREATE_OPTIONAL_FORM_CAPTION}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="subject" className="text-xs text-muted-foreground">
                      {LABELS.CREATE_FORM_SUBJECT}
                    </Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={LABELS.CREATE_FORM_SUBJECT_PH}
                      maxLength={200}
                      className="border-[#C5CBE3]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="task-count" className="text-xs text-muted-foreground">
                      {LABELS.CREATE_FORM_TASK_COUNT}
                    </Label>
                    <Input
                      id="task-count"
                      type="number"
                      min={1}
                      max={200}
                      inputMode="numeric"
                      value={taskCount}
                      onChange={(e) => setTaskCount(e.target.value)}
                      placeholder="10"
                      className="border-[#C5CBE3]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{LABELS.CREATE_FORM_LEVEL}</Label>
                    <Select value={studentLevel || undefined} onValueChange={setStudentLevel}>
                      <SelectTrigger className="border-[#C5CBE3]">
                        <SelectValue placeholder={LABELS.CREATE_FORM_LEVEL_PH} />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDENT_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">{LABELS.CREATE_FORM_TASK_TYPES}</Label>
                    <div className="flex flex-wrap gap-3">
                      {TASK_TYPE_OPTIONS.map((opt) => (
                        <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={taskTypes.includes(opt)}
                            onCheckedChange={() => setTaskTypes((t) => toggleTaskType(t, opt))}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex min-h-0 flex-col gap-2 sm:flex-row sm:items-stretch">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={LABELS.CREATE_PLACEHOLDER_MESSAGE}
                rows={2}
                className="field-sizing-fixed max-h-[min(28vh,220px)] min-h-[72px] min-w-0 flex-1 resize-none overflow-y-auto overflow-x-hidden break-words border-[#C5CBE3]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <Button
                type="button"
                disabled={!input.trim()}
                onClick={sendMessage}
                className="sm:self-end bg-[#4056A1] hover:bg-[#35488a]"
              >
                <Send className="h-4 w-4" />
                {LABELS.CREATE_SEND}
              </Button>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="btn-cta-gold w-full border-0 sm:w-auto"
              disabled={genLoading || !hasFirstUserMessage}
              onClick={openGenerateDialog}
            >
              {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {LABELS.CREATE_GENERATE_TEST}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={answersDialogOpen} onOpenChange={setAnswersDialogOpen}>
          <DialogContent className="border-2 border-[#C5CBE3] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-[#4056A1]">{LABELS.CREATE_ANSWERS_DIALOG_TITLE}</DialogTitle>
              <DialogDescription>{LABELS.CREATE_ANSWERS_DIALOG_DESC}</DialogDescription>
            </DialogHeader>
            <Textarea
              value={correctAnswersReflection}
              onChange={(e) => setCorrectAnswersReflection(e.target.value)}
              placeholder={LABELS.CREATE_ANSWERS_DIALOG_PLACEHOLDER}
              rows={4}
              maxLength={16_000}
              className="border-[#C5CBE3]"
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAnswersDialogOpen(false)}>
                {LABELS.CREATE_ANSWERS_DIALOG_CANCEL}
              </Button>
              <Button
                type="button"
                className="bg-[#D79922] text-white hover:bg-[#c2891c]"
                disabled={genLoading}
                onClick={() => void runGeneration()}
              >
                {genLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {LABELS.CREATE_ANSWERS_DIALOG_CONFIRM}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AppShell>
  )
}
