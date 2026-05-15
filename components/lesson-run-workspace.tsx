"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Loader2, Sparkles } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LABELS } from "@/lib/consts"
import { cn } from "@/lib/utils"

interface LogLine {
  seq: number
  line: string
}

type InterruptPlan = { type: "plan_approval"; planMarkdown: string }
type InterruptAnswers = { type: "answers"; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function LessonRunWorkspace(props: {
  variant: "chat" | "upload"
  appShellActive: "create" | "upload"
  /** Только для variant=chat: начальное содержимое поля материала (например из tesing-data/raw.txt на сервере). */
  defaultMaterialText?: string
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [materialText, setMaterialText] = useState(() =>
    props.variant === "chat" ? (props.defaultMaterialText ?? "") : "",
  )
  const [runId, setRunId] = useState<string | null>(null)
  const [interrupt, setInterrupt] = useState<unknown>(null)
  const [resumeDraft, setResumeDraft] = useState("")
  const [logLines, setLogLines] = useState<LogLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [materialFiles, setMaterialFiles] = useState<File[]>([])
  /** До старта: не показывать HITL с ручным вводом — на сервере сразу auto_solve после spec. */
  const [preferAutoAnswers, setPreferAutoAnswers] = useState(false)
  /** Во время прерывания answers: скрыть ручной ввод, оставить только кнопку авто. */
  const [answersFlowAutoOnly, setAnswersFlowAutoOnly] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastSeqRef = useRef(0)

  const appendLogs = useCallback((events: Array<{ seq: number; emoji: string; title: string; detail: string | null }>) => {
    setLogLines((previous) => {
      const next = [...previous]
      for (const event of events) {
        if (event.seq <= lastSeqRef.current) continue
        lastSeqRef.current = Math.max(lastSeqRef.current, event.seq)
        const detail = event.detail ? ` ${event.detail}` : ""
        next.push({ seq: event.seq, line: `${event.emoji} ${event.title}${detail}` })
      }
      return next.sort((left, right) => left.seq - right.seq)
    })
  }, [])

  /** Явный `runId`: нельзя полагаться на `runId` из замыкания сразу после `setRunId` (батч React). */
  const fetchAndAppendEventsForRun = useCallback(
    async (activeRunId: string) => {
      const response = await fetch(`/api/lesson-runs/${activeRunId}/events?afterSeq=${lastSeqRef.current}`)
      if (!response.ok) return
      const payload = (await response.json()) as {
        events: Array<{ seq: number; emoji: string; title: string; detail: string | null }>
      }
      if (Array.isArray(payload.events) && payload.events.length > 0) {
        appendLogs(payload.events)
      }
    },
    [appendLogs],
  )

  const pollEvents = useCallback(async () => {
    if (!runId) return
    await fetchAndAppendEventsForRun(runId)
  }, [fetchAndAppendEventsForRun, runId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logLines])

  useEffect(() => {
    if (!runId) return
    const timer = window.setInterval(() => {
      void pollEvents()
    }, 2500)
    return () => window.clearInterval(timer)
  }, [pollEvents, runId])

  useEffect(() => {
    setAnswersFlowAutoOnly(false)
  }, [interrupt])

  const onMaterialDrop = useCallback((accepted: File[]) => {
    setMaterialFiles((previous) => [...previous, ...accepted].slice(0, 8))
  }, [])

  const materialDrop = useDropzone({
    onDrop: onMaterialDrop,
    accept: { "application/pdf": [".pdf"], "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"], "image/webp": [".webp"] },
    maxFiles: 8,
    maxSize: 12 * 1024 * 1024,
    disabled: loading,
  })

  const handleApiResult = async (response: Response) => {
    const data = (await response.json()) as {
      success?: boolean
      error?: string
      hint?: string
      runId?: string
      interrupted?: boolean
      interrupt?: unknown
      lessonId?: string
      validationWarnings?: string[]
    }
    if (!response.ok) {
      if (typeof data.runId === "string" && data.runId.length > 0) {
        setRunId(data.runId)
        await fetchAndAppendEventsForRun(data.runId)
      }
      const hintLine = data.hint ? `\n\n${data.hint}` : ""
      throw new Error((data.error || LABELS.CREATE_ERROR_GENERATION) + hintLine)
    }
    if (data.runId) {
      setRunId(data.runId)
      await fetchAndAppendEventsForRun(data.runId)
    }
    if (data.interrupted && data.interrupt !== undefined) {
      setInterrupt(data.interrupt)
      setResumeDraft("")
    } else {
      setInterrupt(null)
    }
    if (data.lessonId) {
      router.push(`/learn/${data.lessonId}/view`)
    }
  }

  const startGeneration = async () => {
    setLoading(true)
    setError(null)
    setLogLines([])
    lastSeqRef.current = 0
    setRunId(null)
    try {
      if (props.variant === "upload" && materialFiles.length === 0) {
        setError(LABELS.API_GENERATE_NO_FILE)
        return
      }
      if (props.variant === "upload") {
        const formData = new FormData()
        if (title.trim()) formData.append("title", title.trim().slice(0, 500))
        for (const file of materialFiles) {
          formData.append("materialFiles", file)
        }
        if (preferAutoAnswers) {
          formData.append("autoSolveRequested", "1")
        }
        const response = await fetch("/api/lesson-runs/from-upload", { method: "POST", body: formData })
        await handleApiResult(response)
        return
      }

      if (!materialText.trim()) {
        setError(LABELS.CREATE_ERROR_NEED_MESSAGE)
        return
      }

      const response = await fetch("/api/lesson-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim().slice(0, 500) || undefined,
          materialText: materialText.trim(),
          ...(preferAutoAnswers ? { autoSolveRequested: true } : {}),
        }),
      })
      await handleApiResult(response)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : LABELS.CREATE_ERROR_GENERIC)
    } finally {
      setLoading(false)
    }
  }

  const sendResume = async () => {
    if (!runId) return
    setLoading(true)
    setError(null)
    try {
      let resume: unknown = resumeDraft.trim()
      if (isRecord(interrupt) && interrupt.type === "plan_approval") {
        resume = { editedPlanMarkdown: resumeDraft.trim() }
      }
      if (isRecord(interrupt) && interrupt.type === "answers") {
        resume = { answersText: resumeDraft.trim() }
      }
      const response = await fetch(`/api/lesson-runs/${runId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      })
      await handleApiResult(response)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : LABELS.CREATE_ERROR_GENERIC)
    } finally {
      setLoading(false)
    }
  }

  const sendAutoAnswers = async () => {
    if (!runId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/lesson-runs/${runId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: { autoSolve: true } }),
      })
      await handleApiResult(response)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : LABELS.CREATE_ERROR_GENERIC)
    } finally {
      setLoading(false)
    }
  }

  const planApprovalInterrupt =
    isRecord(interrupt) && interrupt.type === "plan_approval" ? (interrupt as InterruptPlan) : null
  const answersInterrupt = isRecord(interrupt) && interrupt.type === "answers" ? (interrupt as InterruptAnswers) : null

  const canStartGeneration =
    props.variant === "chat" ? materialText.trim().length > 0 : materialFiles.length > 0

  const titleFields = (
    <div className="space-y-1.5">
      <Label htmlFor="lesson-title">{LABELS.UPLOAD_LABEL_TITLE}</Label>
      <Textarea
        id="lesson-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        rows={1}
        maxLength={500}
        className="min-h-[40px] resize-none border-[#C5CBE3]"
        placeholder={LABELS.UPLOAD_TITLE_PLACEHOLDER}
        disabled={loading}
      />
    </div>
  )

  const materialFields =
    props.variant === "chat" ? (
      <div className="space-y-1.5">
        <Label htmlFor="lesson-material">{LABELS.LESSON_RUN_MATERIAL_SLOT}</Label>
        <p className="text-xs text-muted-foreground">{LABELS.LESSON_RUN_MATERIAL_HINT}</p>
        <Textarea
          id="lesson-material"
          value={materialText}
          onChange={(event) => setMaterialText(event.target.value)}
          rows={5}
          maxLength={240_000}
          className="border-[#C5CBE3] bg-white text-sm"
          disabled={loading}
        />
      </div>
    ) : (
      <div className="space-y-1.5">
        <Label htmlFor="lesson-material-upload">{LABELS.LESSON_RUN_MATERIAL_SLOT}</Label>
        <p className="text-xs text-muted-foreground">{LABELS.LESSON_RUN_MATERIAL_HINT}</p>
        <div className="space-y-2">
          <div
            {...materialDrop.getRootProps()}
            aria-disabled={loading}
            className={cn(
              "rounded-md border border-dashed border-[#C5CBE3] p-3 text-xs text-muted-foreground",
              loading ? "pointer-events-none cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
          >
            <input {...materialDrop.getInputProps()} disabled={loading} />
            {materialFiles.length === 0
              ? LABELS.LESSON_RUN_DROP_MATERIAL
              : materialFiles.map((file) => file.name).join(", ")}
          </div>
          {materialFiles.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMaterialFiles([])}
              disabled={loading}
            >
              {LABELS.LESSON_RUN_CLEAR_FILES}
            </Button>
          ) : null}
        </div>
      </div>
    )

  return (
    <AppShell active={props.appShellActive}>
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-2 font-serif text-3xl font-bold text-primary">{LABELS.CHAT_WITH_AI}</h1>
        {error ? (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Card className="border-2 border-[#C5CBE3] bg-white shadow-sm">
          <CardContent className="flex min-h-0 flex-col gap-3 overflow-hidden p-4">
            <>
              {titleFields}
              {materialFields}
            </>

            {!interrupt ? (
              <div className="flex items-start gap-2 rounded-md border border-[#C5CBE3]/80 bg-muted/20 p-2">
                <Checkbox
                  id="lesson-prefer-auto-answers"
                  checked={preferAutoAnswers}
                  onCheckedChange={(checked) => setPreferAutoAnswers(checked === true)}
                  disabled={loading}
                  className="mt-0.5"
                />
                <label htmlFor="lesson-prefer-auto-answers" className="cursor-pointer text-xs leading-snug text-muted-foreground">
                  {LABELS.LESSON_RUN_PREFER_AUTO_ANSWERS}
                </label>
              </div>
            ) : null}

            {logLines.length > 0 ? (
              <div className="rounded-md border border-[#D79922]/40 bg-[#EFE2BA]/20 p-3">
                <p className="mb-2 text-xs font-medium text-[#4056A1]">{LABELS.LESSON_RUN_LOG_TITLE}</p>
                <div className="max-h-40 overflow-y-auto">
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {logLines.map((line) => (
                      <li key={line.seq}>{line.line}</li>
                    ))}
                  </ul>
                  <div ref={bottomRef} className="h-px w-full shrink-0" aria-hidden />
                </div>
              </div>
            ) : null}

            {loading ? <GenerationBusyHint /> : null}

            {planApprovalInterrupt ? (
              <div className="space-y-2 rounded-lg border border-dashed border-[#4056A1]/50 p-3">
                <p className="text-sm font-medium">{LABELS.LESSON_RUN_PLAN_LABEL}</p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs">
                  {planApprovalInterrupt.planMarkdown}
                </pre>
                <Textarea
                  value={resumeDraft}
                  onChange={(event) => setResumeDraft(event.target.value)}
                  rows={4}
                  placeholder="Вставьте отредактированный план или оставьте пустым"
                  disabled={loading}
                />
                <Button type="button" onClick={() => void sendResume()} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {LABELS.LESSON_RUN_SEND_RESUME}
                </Button>
              </div>
            ) : null}

            {answersInterrupt ? (
              <div className="space-y-2 rounded-lg border border-dashed border-[#4056A1]/50 p-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={answersFlowAutoOnly ? "outline" : "secondary"}
                    onClick={() => setAnswersFlowAutoOnly(false)}
                    disabled={loading}
                  >
                    {LABELS.LESSON_RUN_ANSWERS_MODE_MANUAL}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={answersFlowAutoOnly ? "secondary" : "outline"}
                    onClick={() => setAnswersFlowAutoOnly(true)}
                    disabled={loading}
                  >
                    {LABELS.LESSON_RUN_ANSWERS_MODE_AUTO}
                  </Button>
                </div>
                <p className="text-sm">{answersInterrupt.message}</p>
                {!answersFlowAutoOnly ? (
                  <>
                    <Label htmlFor="lesson-answers-resume">{LABELS.LESSON_RUN_ANSWERS_LABEL}</Label>
                    <Textarea
                      id="lesson-answers-resume"
                      value={resumeDraft}
                      onChange={(event) => setResumeDraft(event.target.value)}
                      rows={5}
                      disabled={loading}
                    />
                  </>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {!answersFlowAutoOnly ? (
                    <Button type="button" variant="secondary" onClick={() => void sendResume()} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {LABELS.LESSON_RUN_SEND_RESUME}
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" onClick={() => void sendAutoAnswers()} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {LABELS.LESSON_RUN_AUTO_BUTTON}
                  </Button>
                </div>
              </div>
            ) : null}

            {!interrupt ? (
              <Button
                type="button"
                className="btn-cta-gold w-full border-0"
                disabled={loading || !canStartGeneration}
                onClick={() => void startGeneration()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {LABELS.LESSON_RUN_START}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </AppShell>
  )
}

function GenerationBusyHint() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  useEffect(() => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const elapsedLabel =
    elapsedSeconds < 60
      ? `${elapsedSeconds} с`
      : `${Math.floor(elapsedSeconds / 60)} мин ${elapsedSeconds % 60} с`

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-[#4056A1]/30 bg-[#4056A1]/5 p-3"
    >
      <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-[#4056A1]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-medium text-[#4056A1]">
          <span className="animate-pulse">{LABELS.LESSON_RUN_BUSY_HINT_TITLE}</span>
          <span className="ml-1 inline-flex gap-0.5" aria-hidden>
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#4056A1]" />
            <span
              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#4056A1]"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#4056A1]"
              style={{ animationDelay: "300ms" }}
            />
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{LABELS.LESSON_RUN_BUSY_HINT_SUBTITLE}</p>
        <p className="mt-1 text-[11px] font-medium text-[#4056A1]/80">Прошло: {elapsedLabel}</p>
      </div>
    </div>
  )
}
