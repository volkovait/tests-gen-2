"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AppShell } from "@/components/app-shell"
import { LABELS } from "@/lib/consts"
import {
  Upload,
  FileText,
  X,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ImageIcon,
} from "lucide-react"

type Step = "upload" | "configure" | "generating"

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<Step>("upload")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [correctAnswersHint, setCorrectAnswersHint] = useState("")

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0]
    if (!f) return
    const okPdf = f.type === "application/pdf"
    const okImage = f.type.startsWith("image/")
    if (okPdf || okImage) {
      setFile(f)
      setTitle(f.name.replace(/\.[^.]+$/, "").replace(/_/g, " ").replace(/-/g, " "))
      setError(null)
    } else {
      setError(LABELS.UPLOAD_ERROR_FILE_TYPE)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 12 * 1024 * 1024,
  })

  const handleRemoveFile = () => {
    setFile(null)
    setStep("upload")
  }

  const handleContinue = () => {
    if (file) setStep("configure")
  }

  const handleGenerate = async () => {
    if (!file) return
    setIsGenerating(true)
    setStep("generating")
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title || file.name.replace(/\.[^.]+$/, ""))
      const answers = correctAnswersHint.trim()
      if (answers) formData.append("correctAnswersHint", answers)

      const response = await fetch("/api/generate-interactive-page", {
        method: "POST",
        body: formData,
      })
      const data = (await response.json()) as {
        error?: string
        lessonId?: string
        viewUrl?: string
        validationWarnings?: string[]
      }
      if (!response.ok) {
        throw new Error(data.error || LABELS.UPLOAD_ERROR_GENERATION)
      }
      if (data.lessonId) {
        const warns = Array.isArray(data.validationWarnings) ? data.validationWarnings : []
        if (warns.length > 0 && typeof window !== "undefined") {
          window.alert(
            `${LABELS.LESSON_PARTIAL_VALIDATION_ALERT_TITLE}\n\n${LABELS.LESSON_PARTIAL_VALIDATION_ALERT_INTRO}\n\n${warns.join("\n\n")}`,
          )
        }
        router.push(data.viewUrl || `/learn/${data.lessonId}/view`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : LABELS.UPLOAD_ERROR_GENERIC)
      setStep("configure")
    } finally {
      setIsGenerating(false)
    }
  }

  const isPdf = file?.type === "application/pdf"

  return (
    <AppShell active="upload">
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 md:hidden">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            {LABELS.NAV_CABINET}
          </Link>
        </div>

        <div className="mb-8 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step === "upload" ? "text-primary" : "text-muted-foreground"}`}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === "upload" ? "bg-primary text-primary-foreground" : file ? "bg-primary/20 text-primary" : "bg-muted"
              }`}
            >
              {file ? <CheckCircle2 className="h-4 w-4" /> : "1"}
            </div>
            <span className="hidden text-sm font-medium sm:inline">{LABELS.UPLOAD_STEP_FILE}</span>
          </div>
          <div className="h-0.5 w-12 bg-border" />
          <div className={`flex items-center gap-2 ${step === "configure" ? "text-primary" : "text-muted-foreground"}`}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === "configure" ? "bg-primary text-primary-foreground" : step === "generating" ? "bg-primary/20 text-primary" : "bg-muted"
              }`}
            >
              {step === "generating" ? <CheckCircle2 className="h-4 w-4" /> : "2"}
            </div>
            <span className="hidden text-sm font-medium sm:inline">{LABELS.UPLOAD_STEP_TITLE}</span>
          </div>
          <div className="h-0.5 w-12 bg-border" />
          <div className={`flex items-center gap-2 ${step === "generating" ? "text-primary" : "text-muted-foreground"}`}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === "generating" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-medium sm:inline">{LABELS.UPLOAD_STEP_DONE}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">{LABELS.UPLOAD_CARD_MATERIAL_TITLE}</CardTitle>
              <CardDescription>{LABELS.UPLOAD_CARD_MATERIAL_DESC}</CardDescription>
            </CardHeader>
            <CardContent>
              {!file ? (
                <div
                  {...getRootProps()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className={`mx-auto mb-4 h-12 w-12 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="mb-1 text-lg font-medium">{isDragActive ? LABELS.UPLOAD_DROP_RELEASE : LABELS.UPLOAD_DROP_PROMPT}</p>
                  <p className="text-sm text-muted-foreground">{LABELS.UPLOAD_MAX_SIZE}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-lg border border-primary/25 bg-card p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      {isPdf ? <FileText className="h-6 w-6 text-primary" /> : <ImageIcon className="h-6 w-6 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {LABELS.UPLOAD_FILE_SIZE_MB.replace("{size}", (file.size / 1024 / 1024).toFixed(2))}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button onClick={handleContinue} className="w-full">
                    {LABELS.UPLOAD_NEXT}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "configure" && file && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">{LABELS.UPLOAD_LESSON_TITLE}</CardTitle>
              <CardDescription>{LABELS.UPLOAD_LESSON_TITLE_DESC}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">{LABELS.UPLOAD_LABEL_TITLE}</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={LABELS.UPLOAD_TITLE_PLACEHOLDER} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correct-answers-hint" className="text-muted-foreground">
                  {LABELS.UPLOAD_CORRECT_ANSWERS_LABEL}{" "}
                  <span className="font-normal">({LABELS.UPLOAD_CORRECT_ANSWERS_OPTIONAL})</span>
                </Label>
                <Textarea
                  id="correct-answers-hint"
                  value={correctAnswersHint}
                  onChange={(e) => setCorrectAnswersHint(e.target.value)}
                  placeholder={LABELS.UPLOAD_CORRECT_ANSWERS_PLACEHOLDER}
                  rows={3}
                  maxLength={16_000}
                  className="min-h-[72px] resize-y"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("upload")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {LABELS.UPLOAD_BACK}
                </Button>
                <Button className="flex-1" onClick={handleGenerate}>
                  {LABELS.UPLOAD_CREATE_LESSON}
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "generating" && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <h3 className="mb-2 font-serif text-xl font-semibold">{LABELS.UPLOAD_GENERATING_TITLE}</h3>
              <p className="mx-auto max-w-sm text-muted-foreground">{LABELS.UPLOAD_GENERATING_DESC}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </AppShell>
  )
}
