"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import logoImg from "@/assets/logo.png"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Play,
  Trophy,
  RotateCcw,
  Home
} from "lucide-react"

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

interface Answer {
  questionId: string
  answer: string | number | null
  isCorrect?: boolean
}

interface TestTakingClientProps {
  test: Test
}

export default function TestTakingClient({ test }: TestTakingClientProps) {
  const router = useRouter()
  const [mode, setMode] = useState<"preview" | "taking" | "results">("preview")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0, percentage: 0 })

  const currentQuestion = test.questions[currentQuestionIndex]
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id)
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (mode === "taking" && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [mode, startTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartTest = () => {
    setMode("taking")
    setStartTime(new Date())
    setAnswers(test.questions.map(q => ({ questionId: q.id, answer: null })))
  }

  const handleAnswer = (answer: string | number) => {
    setAnswers(prev => 
      prev.map(a => 
        a.questionId === currentQuestion.id ? { ...a, answer } : a
      )
    )
  }

  const handleNext = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const calculateResults = useCallback(() => {
    let correct = 0
    const gradedAnswers = answers.map(answer => {
      const question = test.questions.find(q => q.id === answer.questionId)
      if (!question) return answer

      let isCorrect = false
      if (question.type === "multiple_choice") {
        isCorrect = answer.answer === question.correctAnswer
      } else if (question.type === "true_false") {
        isCorrect = answer.answer?.toString().toLowerCase() === question.correctAnswer.toString().toLowerCase()
      } else if (question.type === "fill_blank") {
        isCorrect = answer.answer?.toString().toLowerCase().trim() === question.correctAnswer.toString().toLowerCase().trim()
      }

      if (isCorrect) correct++
      return { ...answer, isCorrect }
    })

    setAnswers(gradedAnswers)
    setScore({
      correct,
      total: test.questions.length,
      percentage: Math.round((correct / test.questions.length) * 100)
    })
  }, [answers, test.questions])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    calculateResults()

    try {
      // Save attempt to database
      const response = await fetch("/api/submit-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: test.id,
          answers,
          timeSpent: elapsedTime
        })
      })

      if (!response.ok) {
        console.error("[v0] Failed to save test attempt")
      }
    } catch (error) {
      console.error("[v0] Error saving attempt:", error)
    }

    setMode("results")
    setIsSubmitting(false)
  }

  const handleRetake = () => {
    setMode("preview")
    setCurrentQuestionIndex(0)
    setAnswers([])
    setStartTime(null)
    setElapsedTime(0)
    setScore({ correct: 0, total: 0, percentage: 0 })
  }

  // Preview Mode
  if (mode === "preview") {
    return (
      <div className="min-h-screen bg-background">
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
              <Link href="/upload">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to upload
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-serif">{test.title}</CardTitle>
              <CardDescription>
                {test.source_filename && `Based on: ${test.source_filename}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-primary/5 text-center">
                  <p className="text-3xl font-bold text-primary">{test.question_count}</p>
                  <p className="text-sm text-muted-foreground">Questions</p>
                </div>
                <div className="p-4 rounded-lg bg-accent/5 text-center">
                  <p className="text-3xl font-bold text-accent capitalize">{test.settings.difficulty || "Medium"}</p>
                  <p className="text-sm text-muted-foreground">Difficulty</p>
                </div>
              </div>

              {test.settings.questionTypes && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Question Types:</p>
                  <div className="flex flex-wrap gap-2">
                    {test.settings.questionTypes.map((type) => (
                      <span key={type} className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground capitalize">
                        {type.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleStartTest} size="lg" className="w-full">
                <Play className="h-5 w-5 mr-2" />
                Start Test
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Results Mode
  if (mode === "results") {
    const getScoreColor = () => {
      if (score.percentage >= 80) return "text-green-500"
      if (score.percentage >= 60) return "text-yellow-500"
      return "text-red-500"
    }

    const getScoreBg = () => {
      if (score.percentage >= 80) return "bg-green-500/10"
      if (score.percentage >= 60) return "bg-yellow-500/10"
      return "bg-red-500/10"
    }

    return (
      <div className="min-h-screen bg-background">
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
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          {/* Score Card */}
          <Card className="mb-8">
            <CardContent className="py-8">
              <div className="text-center">
                <div className={`w-24 h-24 rounded-full ${getScoreBg()} flex items-center justify-center mx-auto mb-4`}>
                  <Trophy className={`h-12 w-12 ${getScoreColor()}`} />
                </div>
                <h2 className="text-3xl font-serif font-bold text-foreground mb-2">
                  Test Complete!
                </h2>
                <p className={`text-5xl font-bold ${getScoreColor()} mb-2`}>
                  {score.percentage}%
                </p>
                <p className="text-muted-foreground">
                  You got {score.correct} out of {score.total} questions correct
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Time: {formatTime(elapsedTime)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 mb-8">
            <Button onClick={handleRetake} variant="outline" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Test
            </Button>
            <Button asChild className="flex-1">
              <Link href="/upload">
                <Home className="h-4 w-4 mr-2" />
                New upload
              </Link>
            </Button>
          </div>

          {/* Question Review */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Question Review</CardTitle>
              <CardDescription>Review your answers and learn from mistakes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {test.questions.map((question, index) => {
                const answer = answers.find(a => a.questionId === question.id)
                const isCorrect = answer?.isCorrect

                return (
                  <div key={question.id} className={`p-4 rounded-lg border ${isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        ) : (
                          <XCircle className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Question {index + 1}</p>
                        <p className="font-medium text-foreground">{question.question}</p>
                      </div>
                    </div>

                    {question.type === "multiple_choice" && question.options && (
                      <div className="ml-9 space-y-1">
                        {question.options.map((option, optIndex) => (
                          <p 
                            key={optIndex} 
                            className={`text-sm ${
                              optIndex === question.correctAnswer
                                ? "text-green-600 font-medium"
                                : answer?.answer === optIndex && !isCorrect
                                  ? "text-red-600 line-through"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {option}
                            {optIndex === question.correctAnswer && " ✓"}
                          </p>
                        ))}
                      </div>
                    )}

                    {question.type === "true_false" && (
                      <div className="ml-9">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                            {answer?.answer?.toString() || "No answer"}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="text-green-600">{question.correctAnswer.toString()}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {question.type === "fill_blank" && (
                      <div className="ml-9">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                            {answer?.answer?.toString() || "No answer"}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="text-green-600">{question.correctAnswer.toString()}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {question.explanation && (
                      <div className="ml-9 mt-3 p-3 rounded bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Explanation:</span> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Taking Mode
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={logoImg}
              alt="Lingua Bloom"
              width={80}
              height={80}
              className="rounded-lg"
            />
            <span className="font-serif text-lg font-semibold text-foreground">{test.title}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(elapsedTime)}
            </div>
            <span className="text-sm font-medium text-foreground">
              {currentQuestionIndex + 1} / {test.questions.length}
            </span>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="sticky top-16 bg-background border-b border-border">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground capitalize">
                {currentQuestion.type.replace("_", " ")}
              </span>
              <span className="text-sm font-medium text-primary">
                Question {currentQuestionIndex + 1}
              </span>
            </div>
            <CardTitle className="text-xl font-serif leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Multiple Choice */}
            {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
              <RadioGroup
                value={currentAnswer?.answer?.toString() || ""}
                onValueChange={(value) => handleAnswer(parseInt(value))}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center">
                    <RadioGroupItem
                      value={index.toString()}
                      id={`option-${index}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`option-${index}`}
                      className="flex-1 p-4 rounded-lg border cursor-pointer transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* True/False */}
            {currentQuestion.type === "true_false" && (
              <RadioGroup
                value={currentAnswer?.answer?.toString() || ""}
                onValueChange={(value) => handleAnswer(value)}
                className="space-y-3"
              >
                {["true", "false"].map((option) => (
                  <div key={option} className="flex items-center">
                    <RadioGroupItem
                      value={option}
                      id={`option-${option}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`option-${option}`}
                      className="flex-1 p-4 rounded-lg border cursor-pointer transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50 capitalize"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Fill in the Blank */}
            {currentQuestion.type === "fill_blank" && (
              <div className="space-y-2">
                <Label htmlFor="answer">Your Answer</Label>
                <Input
                  id="answer"
                  value={currentAnswer?.answer?.toString() || ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="text-lg"
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              {currentQuestionIndex === test.questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Submitting..." : "Submit Test"}
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleNext} className="flex-1">
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Navigator */}
        <div className="mt-6">
          <p className="text-sm font-medium text-muted-foreground mb-3">Question Navigator</p>
          <div className="flex flex-wrap gap-2">
            {test.questions.map((_, index) => {
              const answered = answers[index]?.answer !== null
              const isCurrent = index === currentQuestionIndex
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : answered
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
