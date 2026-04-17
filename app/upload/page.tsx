"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import logoImg from "@/assets/logo.png"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { 
  Upload, 
  FileText, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

type QuestionType = "multiple_choice" | "true_false" | "fill_blank"

const DRAFT_TEST_STORAGE_KEY = "linguaBloomDraftTest"

interface TestSettings {
  title: string
  questionCount: number
  questionTypes: QuestionType[]
  difficulty: "easy" | "medium" | "hard"
}

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<"upload" | "configure" | "generating">("upload")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<TestSettings>({
    title: "",
    questionCount: 10,
    questionTypes: ["multiple_choice"],
    difficulty: "medium"
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles[0]
    if (pdfFile && pdfFile.type === "application/pdf") {
      setFile(pdfFile)
      setSettings(prev => ({
        ...prev,
        title: pdfFile.name.replace(".pdf", "").replace(/_/g, " ").replace(/-/g, " ")
      }))
      setError(null)
    } else {
      setError("Please upload a PDF file")
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"]
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const handleRemoveFile = () => {
    setFile(null)
    setStep("upload")
  }

  const handleContinue = () => {
    if (file) {
      setStep("configure")
    }
  }

  const handleQuestionTypeToggle = (type: QuestionType) => {
    setSettings(prev => {
      const types = prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
      return { ...prev, questionTypes: types.length > 0 ? types : prev.questionTypes }
    })
  }

  const handleGenerate = async () => {
    if (!file || settings.questionTypes.length === 0) return
    
    setIsGenerating(true)
    setStep("generating")
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", settings.title || file.name.replace(".pdf", ""))
      formData.append("questionCount", settings.questionCount.toString())
      formData.append("questionTypes", JSON.stringify(settings.questionTypes))
      formData.append("difficulty", settings.difficulty)

      const response = await fetch("/api/generate-test", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate test")
      }

      if (data.draft === true && data.test) {
        sessionStorage.setItem(DRAFT_TEST_STORAGE_KEY, JSON.stringify(data.test))
        router.push("/test/draft")
        return
      }

      if (data.testId) {
        router.push(`/test/${data.testId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setStep("configure")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/upload" className="flex items-center gap-3">
            <Image
              src={logoImg}
              alt="Lingua Bloom"
              width={80}
              height={80}
              className="rounded-lg"
            />
            <span className="font-serif text-lg font-semibold text-foreground">Lingua Bloom</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === "upload" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === "upload" ? "bg-primary text-primary-foreground" : 
              file ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {file ? <CheckCircle2 className="h-4 w-4" /> : "1"}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Upload</span>
          </div>
          <div className="w-12 h-0.5 bg-border" />
          <div className={`flex items-center gap-2 ${step === "configure" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === "configure" ? "bg-primary text-primary-foreground" : 
              step === "generating" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {step === "generating" ? <CheckCircle2 className="h-4 w-4" /> : "2"}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Configure</span>
          </div>
          <div className="w-12 h-0.5 bg-border" />
          <div className={`flex items-center gap-2 ${step === "generating" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === "generating" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">Generate</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Upload Your PDF</CardTitle>
              <CardDescription>
                Drag and drop your study material or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!file ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-lg font-medium text-foreground mb-1">
                    {isDragActive ? "Drop your PDF here" : "Drag & drop your PDF"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse (max 10MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRemoveFile}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button onClick={handleContinue} className="w-full">
                    Continue to Configure
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure */}
        {step === "configure" && file && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Configure Your Test</CardTitle>
              <CardDescription>
                Customize how your test will be generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Test Title</Label>
                <Input
                  id="title"
                  value={settings.title}
                  onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter a title for your test"
                />
              </div>

              {/* Question Count */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Number of Questions</Label>
                  <span className="text-sm font-medium text-primary">{settings.questionCount}</span>
                </div>
                <Slider
                  value={[settings.questionCount]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, questionCount: value }))}
                  min={5}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 questions</span>
                  <span>30 questions</span>
                </div>
              </div>

              {/* Question Types */}
              <div className="space-y-3">
                <Label>Question Types</Label>
                <div className="space-y-2">
                  {[
                    { id: "multiple_choice" as const, label: "Multiple Choice", desc: "4 options, one correct answer" },
                    { id: "true_false" as const, label: "True/False", desc: "Simple yes or no questions" },
                    { id: "fill_blank" as const, label: "Fill in the Blank", desc: "Complete the sentence" }
                  ].map((type) => (
                    <div
                      key={type.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        settings.questionTypes.includes(type.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => handleQuestionTypeToggle(type.id)}
                    >
                      <Checkbox
                        checked={settings.questionTypes.includes(type.id)}
                        onCheckedChange={() => handleQuestionTypeToggle(type.id)}
                      />
                      <div>
                        <p className="font-medium text-foreground">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-3">
                <Label>Difficulty Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "easy" as const, label: "Easy" },
                    { id: "medium" as const, label: "Medium" },
                    { id: "hard" as const, label: "Hard" }
                  ].map((level) => (
                    <Button
                      key={level.id}
                      type="button"
                      variant={settings.difficulty === level.id ? "default" : "outline"}
                      onClick={() => setSettings(prev => ({ ...prev, difficulty: level.id }))}
                      className="w-full"
                    >
                      {level.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep("upload")}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={settings.questionTypes.length === 0}
                  className="flex-1"
                >
                  Generate Test
                  <Sparkles className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Generating */}
        {step === "generating" && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                  Generating Your Test
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Our AI is analyzing your document and creating personalized questions. This may take a moment...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
